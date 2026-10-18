import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import type Stripe from "stripe";
import {
  PaymentStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  getSubscriptionClientSecret,
  getSubscriptionPeriod,
  mapStripeSubscriptionStatus,
  resolveSubscriptionPlan,
  subscriptionPeriodPrismaData,
} from "../stripe/stripe.helpers";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";
import { PaymentMethodService } from "../payment-method/payment-method.service";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly refundService: RefundService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  /**
   * Bắt đầu thanh toán hoặc đổi gói. Bản cũ LUÔN tạo subscription Stripe mới:
   * - web gọi 2 lần mỗi lần vào trang thanh toán → các subscription "incomplete" rác;
   * - nâng gói tạo subscription THỨ HAI, DB ghi đè id cũ, gói cũ vẫn tiếp tục trừ tiền.
   * Giờ: chưa thanh toán xong cùng giá → dùng lại; đang có hiệu lực cùng giá → báo trùng;
   * đang có hiệu lực giá khác → đổi giá trên CHÍNH subscription đó (Stripe tự tính chênh lệch).
   */
  async createOrUpgrade(
    userId: number,
    plan: SubscriptionPlan,
    paymentMethodId?: string,
  ): Promise<{
    clientSecret: string | null;
    subscriptionId: string;
    changedPlan?: boolean;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan },
    });
    if (!planConfig?.stripePriceId)
      throw new BadRequestException("Plan not available");
    const priceId = planConfig.stripePriceId;

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (paymentMethodId) {
      await this.paymentMethodService.assertUserOwnsCard(
        userId,
        paymentMethodId,
      );
    }

    if (sub?.stripeSubscriptionId) {
      const existing = await this.stripe.retrieveSubscription(
        sub.stripeSubscriptionId,
      );
      const samePrice = existing.items.data[0]?.price?.id === priceId;

      if (existing.status === "incomplete") {
        if (samePrice) {
          return {
            clientSecret: getSubscriptionClientSecret(existing),
            subscriptionId: existing.id,
          };
        }
        // Đổi ý sang gói khác khi chưa trả tiền: bỏ cái đang dở rồi tạo mới bên dưới
        await this.stripe.cancelSubscription(existing.id, false);
      } else if (["active", "trialing", "past_due"].includes(existing.status)) {
        if (samePrice) {
          throw new ConflictException("Bạn đang dùng gói này rồi");
        }
        const updated = await this.stripe.updateSubscription(
          existing.id,
          priceId,
        );
        const customerId =
          typeof updated.customer === "string"
            ? updated.customer
            : updated.customer.id;
        await this.persist(userId, sub, plan, updated, customerId, priceId);
        return {
          clientSecret: null,
          subscriptionId: updated.id,
          changedPlan: true,
        };
      }
      // canceled / incomplete_expired / unpaid / paused: tạo subscription mới
    }

    let stripeCustomerId = sub?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.createCustomer(
        user.email,
        user.name ?? undefined,
        `customer:user-${userId}`,
      );
      stripeCustomerId = customer.id;
    }

    const stripeSub = await this.stripe.createSubscription({
      customerId: stripeCustomerId,
      priceId,
      trialDays: planConfig.trialDays || undefined,
      metadata: { userId: userId.toString(), plan },
      defaultPaymentMethodId: paymentMethodId,
      // Hai request trùng nhau (bấm 2 lần, mạng gửi lại) trong cùng 10 phút → cùng một subscription
      idempotencyKey: `subscription:user-${userId}:${priceId}:${paymentMethodId ?? "new-card"}:${Math.floor(Date.now() / 600_000)}`,
    });

    await this.persist(userId, sub, plan, stripeSub, stripeCustomerId, priceId);

    return {
      clientSecret: getSubscriptionClientSecret(stripeSub),
      subscriptionId: stripeSub.id,
    };
  }

  private async persist(
    userId: number,
    sub: { plan: SubscriptionPlan } | null,
    plan: SubscriptionPlan,
    stripeSub: Stripe.Subscription,
    stripeCustomerId: string,
    priceId: string,
  ) {
    const period = getSubscriptionPeriod(stripeSub);
    const planToPersist = resolveSubscriptionPlan({
      stripeStatus: stripeSub.status,
      targetPlan: plan,
      currentPlan: sub?.plan,
    });

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: planToPersist,
        status: mapStripeSubscriptionStatus(stripeSub.status),
        stripeCustomerId,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        ...subscriptionPeriodPrismaData(period),
      },
      update: {
        plan: planToPersist,
        status: mapStripeSubscriptionStatus(stripeSub.status),
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        ...subscriptionPeriodPrismaData(period),
      },
    });
  }

  async cancel(userId: number): Promise<void> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { userId },
    });
    if (!sub.stripeSubscriptionId)
      throw new BadRequestException("No active subscription");
    await this.stripe.cancelSubscription(sub.stripeSubscriptionId, true);
    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async getStatus(userId: number) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
  }

  async requestRefund(userId: number, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        userId,
        subscriptionId: { not: null },
        status: PaymentStatus.SUCCEEDED,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) {
      throw new BadRequestException(
        "Không có giao dịch subscription để hoàn tiền",
      );
    }

    const result = await this.refundService.refundPayment(payment.id, {
      requestedByUserId: userId,
      role: Role.USER,
      reason: reason ?? "Yêu cầu hoàn tiền subscription",
    });

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (sub?.stripeSubscriptionId) {
      await this.stripe.cancelSubscription(sub.stripeSubscriptionId, false);
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
      });
    }

    return result;
  }

  async getPlans() {
    return this.prisma.subscriptionPlanConfig.findMany({
      where: { active: true },
      orderBy: { priceUsdCents: "asc" },
    });
  }
}
