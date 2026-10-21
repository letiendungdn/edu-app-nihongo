import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentStatus, Role } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";

const SUBSCRIPTION_REFUND_WINDOW_DAYS = 7;

export type RefundResult = {
  paymentId: number;
  stripeRefundId: string;
  amountCents: number;
  status: PaymentStatus;
  message: string;
};

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  private paymentInclude() {
    return {
      user: { select: { id: true, email: true, name: true } },
      session: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          topic: true,
          coach: { select: { id: true, user: { select: { name: true } } } },
        },
      },
      subscription: {
        select: { id: true, plan: true, status: true },
      },
    } as const;
  }

  async listUserPayments(userId: number) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        session: this.paymentInclude().session,
        subscription: this.paymentInclude().subscription,
      },
    });
  }

  async listPaymentsForAdmin(params: {
    userId?: number;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(1, params.limit ?? 50), 100);
    const skip = (page - 1) * limit;

    const where: {
      userId?: number;
      status?: PaymentStatus;
    } = {};
    if (params.userId) where.userId = params.userId;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.paymentInclude(),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async refundPayment(
    paymentId: number,
    params: {
      requestedByUserId: number;
      role: Role;
      reason?: string;
      amountCents?: number;
    },
  ): Promise<RefundResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: true,
        subscription: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("Không tìm thấy giao dịch");
    }

    const isOwner = payment.userId === params.requestedByUserId;
    const isAdmin = params.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Không có quyền hoàn tiền giao dịch này");
    }

    if (
      payment.status === PaymentStatus.REFUNDED ||
      payment.status === PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException("Giao dịch đã được hoàn tiền");
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        "Chỉ hoàn tiền cho giao dịch đã thanh toán thành công",
      );
    }

    if (!payment.stripeChargeId) {
      throw new BadRequestException("Giao dịch chưa có charge Stripe để hoàn");
    }

    if (!isAdmin && payment.sessionId && payment.session) {
      const hoursUntil =
        (payment.session.scheduledAt.getTime() - Date.now()) / 3_600_000;
      if (hoursUntil <= 24) {
        throw new BadRequestException(
          "Chỉ hoàn tiền khi hủy buổi học trước 24 giờ",
        );
      }
    }

    if (!isAdmin && payment.subscriptionId) {
      const daysSince =
        (Date.now() - payment.createdAt.getTime()) / (24 * 3_600_000);
      if (daysSince > SUBSCRIPTION_REFUND_WINDOW_DAYS) {
        throw new BadRequestException(
          `Chỉ hoàn tiền subscription trong ${SUBSCRIPTION_REFUND_WINDOW_DAYS} ngày đầu`,
        );
      }
    }

    if (
      params.amountCents &&
      params.amountCents > 0 &&
      params.amountCents < payment.amountCents &&
      !isAdmin
    ) {
      throw new ForbiddenException("Chỉ admin mới hoàn tiền một phần");
    }

    const refundAmount =
      params.amountCents && params.amountCents > 0
        ? Math.min(params.amountCents, payment.amountCents)
        : payment.amountCents;

    // Mỗi giao dịch chỉ hoàn MỘT lần (đã hoàn thì chặn ở trên), nên khóa theo giao dịch: bấm hai
    // lần hay hai request cùng lúc (đều qua bước kiểm tra trạng thái) → cùng một refund trên Stripe.
    // Bản cũ không có khóa: hoàn một phần hai lần là hoàn hai lần.
    const stripeRefund = await this.stripe.refundPayment(
      payment.stripeChargeId,
      refundAmount < payment.amountCents ? refundAmount : undefined,
      `refund-payment-${payment.id}`,
    );

    const newStatus =
      refundAmount < payment.amountCents
        ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.REFUNDED;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        refundedAt: new Date(),
        refundAmountCents: refundAmount,
        refundReason: params.reason ?? null,
        metadata: {
          ...(typeof payment.metadata === "object" && payment.metadata
            ? (payment.metadata as object)
            : {}),
          stripeRefundId: stripeRefund.id,
        },
      },
    });

    return {
      paymentId: payment.id,
      stripeRefundId: stripeRefund.id,
      amountCents: refundAmount,
      status: newStatus,
      message:
        newStatus === PaymentStatus.REFUNDED
          ? "Đã hoàn tiền toàn bộ"
          : "Đã hoàn tiền một phần",
    };
  }

  async refundByChargeId(
    chargeId: string,
    data: {
      amountCents?: number;
      reason?: string;
      paymentId?: number;
    },
  ): Promise<void> {
    const payment = data.paymentId
      ? await this.prisma.payment.findUnique({ where: { id: data.paymentId } })
      : await this.prisma.payment.findFirst({
          where: { stripeChargeId: chargeId },
        });

    if (!payment || payment.status === PaymentStatus.REFUNDED) return;

    const refundAmount =
      data.amountCents ?? payment.refundAmountCents ?? payment.amountCents;
    const isPartial = refundAmount < payment.amountCents;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isPartial
          ? PaymentStatus.PARTIALLY_REFUNDED
          : PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmountCents: refundAmount,
        refundReason: data.reason ?? payment.refundReason,
      },
    });
  }
}
