import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentStatus,
  SessionStatus,
  NotificationType,
} from "@prisma/client";
import Stripe from "stripe";
import { KafkaTopics, PaymentSucceededEvent } from "@app/contracts";
import { PrismaService } from "@app/prisma";
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriod,
  mapStripeSubscriptionStatus,
  resolveSubscriptionPlan,
  subscriptionPeriodPrismaData,
  type ExpandedStripeInvoice,
} from "../stripe/stripe.helpers";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";
import { NotificationService } from "../../../api-gateway/src/realtime/notification.service";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly refundService: RefundService,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async handleStripeEvent(rawBody: Buffer, signature: string): Promise<void> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;

    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });
    if (existing?.status === "PROCESSED") return;

    const record = await this.prisma.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        payload: JSON.parse(JSON.stringify(event)) as object,
        status: "RECEIVED",
      },
      update: { retryCount: { increment: 1 } },
    });

    try {
      await this.processEvent(event);
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: "FAILED", errorMessage: message },
      });
      throw err;
    }
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.handleSubscriptionChange(event.data.object);
        break;
      case "payment_intent.succeeded":
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(event.data.object);
        break;
      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object);
        break;
      case "charge.refunded":
        await this.handleChargeRefunded(event.data.object);
        break;
      default:
        await this.prisma.webhookEvent.updateMany({
          where: { eventId: event.id },
          data: { status: "IGNORED" },
        });
    }
  }

  private async handleSubscriptionChange(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const period = getSubscriptionPeriod(stripeSub);
    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
      select: { plan: true },
    });

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        plan: resolveSubscriptionPlan({
          stripeStatus: stripeSub.status,
          targetPlan:
            (stripeSub.metadata?.plan as SubscriptionPlan | undefined) ??
            existing?.plan ??
            SubscriptionPlan.FREE,
          currentPlan: existing?.plan,
          metadataPlan: stripeSub.metadata?.plan,
        }),
        status: mapStripeSubscriptionStatus(stripeSub.status),
        ...subscriptionPeriodPrismaData(period),
        canceledAt: stripeSub.canceled_at
          ? new Date(stripeSub.canceled_at * 1000)
          : null,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });
  }

  /**
   * Payment SUCCEEDED + buổi coach CONFIRMED + event `edu.payment.succeeded` ghi trong CÙNG một
   * transaction (transactional outbox, relay của exam-service đẩy lên Kafka). Bản cũ gửi thẳng Kafka
   * sau khi đã cập nhật DB: Kafka lỗi đúng lúc đó là event mất, không thử lại.
   */
  private async handlePaymentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payments = await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          stripeChargeId: intent.latest_charge as string,
        },
      });
      const succeeded = await tx.payment.findMany({
        where: {
          stripePaymentIntentId: intent.id,
          status: PaymentStatus.SUCCEEDED,
        },
        include: {
          subscription: { select: { plan: true } },
          session: { select: { id: true, scheduledAt: true } },
        },
      });
      for (const payment of succeeded) {
        if (payment.sessionId) {
          await tx.coachingSession.updateMany({
            where: { id: payment.sessionId, status: SessionStatus.PENDING },
            data: { status: SessionStatus.CONFIRMED },
          });
        }
        const referenceId = payment.sessionId ?? payment.subscriptionId;
        if (referenceId == null) continue;
        const event: PaymentSucceededEvent = {
          paymentId: payment.id,
          userId: payment.userId,
          amountCents: payment.amountCents,
          type: payment.sessionId ? "session" : "subscription",
          referenceId: referenceId.toString(),
          paidAt: new Date().toISOString(),
        };
        await tx.outboxEvent.create({
          data: {
            topic: KafkaTopics.PAYMENT_SUCCEEDED,
            key: String(payment.userId),
            // eventId theo payment + intent: Stripe gửi lại webhook thì consumer bỏ được bản trùng
            payload: {
              eventId: `payment-${payment.id}-${intent.id}`,
              ...event,
            },
          },
        });
      }
      return succeeded;
    });

    // Thông báo trong app gửi SAU khi commit (lỗi gửi thông báo không làm hỏng việc ghi nhận tiền)
    for (const payment of payments) {
      await this.sendPaymentNotification(payment);
    }
  }

  private async sendPaymentNotification(payment: {
    id: number;
    userId: number;
    sessionId: number | null;
    subscriptionId: number | null;
    subscription?: { plan: SubscriptionPlan } | null;
    session?: { id: number; scheduledAt: Date } | null;
  }) {
    if (!this.notificationService) return;

    if (payment.sessionId && payment.session) {
      await this.notificationService.send({
        userId: payment.userId,
        type: NotificationType.SESSION_CONFIRMED,
        title: "Lịch học đã được xác nhận",
        body: `Buổi coaching ngày ${payment.session.scheduledAt.toLocaleDateString("vi-VN")} đã thanh toán thành công.`,
        metadata: { sessionId: payment.session.id, paymentId: payment.id },
      });
      return;
    }

    if (payment.subscriptionId) {
      const plan = payment.subscription?.plan ?? SubscriptionPlan.FREE;
      await this.notificationService.send({
        userId: payment.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: "Thanh toán thành công",
        body: `Gói ${plan} đã được kích hoạt. Chúc bạn học tốt!`,
        metadata: { paymentId: payment.id, plan },
      });
    }
  }

  private async handlePaymentFailed(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (subscriptionId) {
      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubId = getInvoiceSubscriptionId(invoice);
    if (!stripeSubId || invoice.amount_paid <= 0) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) return;

    const expanded = invoice as ExpandedStripeInvoice;
    const pi = expanded.payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : (pi?.id ?? null);
    if (!paymentIntentId) return;

    let chargeId: string | null = null;
    if (typeof pi === "object" && pi?.latest_charge) {
      chargeId =
        typeof pi.latest_charge === "string"
          ? pi.latest_charge
          : pi.latest_charge.id;
    }

    const existing = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (existing) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          stripeChargeId: chargeId,
          amountCents: invoice.amount_paid,
          stripeReceiptUrl: invoice.hosted_invoice_url ?? null,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          userId: sub.userId,
          amountCents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
          subscriptionId: sub.id,
          stripeReceiptUrl: invoice.hosted_invoice_url ?? null,
        },
      });
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { subscription: { select: { plan: true } } },
    });

    if (payment) {
      await this.sendPaymentNotification({
        ...payment,
        sessionId: null,
        session: null,
      });
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    await this.refundService.refundByChargeId(charge.id, {
      amountCents: charge.amount_refunded,
      reason: "stripe_webhook",
    });
  }
}
