import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  CoachingSession,
  PaymentStatus,
  Role,
  SessionStatus,
} from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";

/** Thời lượng buổi đặt qua marketplace (khớp `durationMin` mặc định của CoachingSession). */
const SESSION_DURATION_MIN = 60;
/** Không gian khóa advisory cho đặt lịch (tránh đụng khóa của tính năng khác). */
export const BOOKING_LOCK_NAMESPACE = 41_001;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly refundService: RefundService,
  ) {}

  async bookSession(params: {
    learnerId: number;
    coachId: number;
    scheduledAt: Date;
    topic?: string;
  }): Promise<{ session: CoachingSession; clientSecret: string }> {
    const coach = await this.prisma.coachProfile.findUniqueOrThrow({
      where: { id: params.coachId },
      include: { user: true },
    });
    if (!coach.isActive)
      throw new BadRequestException("Coach is not available");

    const learner = await this.prisma.user.findUniqueOrThrow({
      where: { id: params.learnerId },
      include: { subscription: true },
    });
    const priceUsdCents = coach.hourlyRateUsd;
    const platformFeePercent = 20;

    // Kiểm tra trùng lịch và tạo buổi trong CÙNG transaction, giữ khóa theo coach.
    // Bản cũ kiểm tra ngoài transaction (check-then-act): hai người đặt cùng lúc đều qua bước kiểm
    // tra và cùng được tạo. Bản cũ cũng chỉ so `scheduledAt` bằng nhau: 10:00 và 10:30 (buổi 60 phút)
    // chồng nhau vẫn lọt.
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_NAMESPACE}::int, ${params.coachId}::int)`;
      const start = params.scheduledAt;
      const end = new Date(start.getTime() + SESSION_DURATION_MIN * 60_000);
      const overlapping = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM "CoachingSession"
        WHERE "coachId" = ${params.coachId}
          AND status <> 'CANCELED'
          AND "scheduledAt" < ${end}
          AND "scheduledAt" + make_interval(mins => "durationMin") > ${start}
        LIMIT 1`;
      if (overlapping.length > 0) {
        throw new ConflictException("This time slot is already booked");
      }
      const created = await tx.coachingSession.create({
        data: {
          learnerId: params.learnerId,
          coachId: params.coachId,
          scheduledAt: params.scheduledAt,
          status: SessionStatus.PENDING,
          topic: params.topic,
          priceUsdCents,
          platformFeePercent,
        },
      });
      await tx.payment.create({
        data: {
          userId: params.learnerId,
          amountCents: priceUsdCents,
          currency: coach.currency,
          status: PaymentStatus.PENDING,
          sessionId: created.id,
        },
      });
      return created;
    });

    let stripeCustomerId = learner.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.createCustomer(
        learner.email,
        learner.name ?? undefined,
      );
      stripeCustomerId = customer.id;
    }

    const intent = await this.stripe.createPaymentIntent({
      amountCents: priceUsdCents,
      currency: coach.currency,
      customerId: stripeCustomerId,
      metadata: {
        sessionId: session.id.toString(),
        coachId: params.coachId.toString(),
        learnerId: params.learnerId.toString(),
      },
    });

    await this.prisma.payment.updateMany({
      where: { sessionId: session.id },
      data: { stripePaymentIntentId: intent.id },
    });

    return { session, clientSecret: intent.client_secret! };
  }

  async cancelSession(
    sessionId: number,
    userId: number,
    reason?: string,
  ): Promise<{
    message: string;
    refunded: boolean;
    refundAmountCents?: number;
  }> {
    const session = await this.prisma.coachingSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { payment: true },
    });

    if (session.learnerId !== userId) {
      throw new ForbiddenException("Không có quyền hủy buổi học này");
    }

    if (
      session.status === SessionStatus.COMPLETED ||
      session.status === SessionStatus.CANCELED
    ) {
      throw new BadRequestException("Session cannot be canceled");
    }

    let refunded = false;
    let refundAmountCents: number | undefined;

    const hoursUntilSession =
      (session.scheduledAt.getTime() - Date.now()) / 3_600_000;
    if (
      session.payment &&
      session.payment.status === PaymentStatus.SUCCEEDED &&
      session.payment.stripeChargeId &&
      hoursUntilSession > 24
    ) {
      const result = await this.refundService.refundPayment(
        session.payment.id,
        {
          requestedByUserId: userId,
          role: Role.USER,
          reason: reason ?? "Hủy buổi coaching",
        },
      );
      refunded = true;
      refundAmountCents = result.amountCents;
    }

    await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CANCELED,
        canceledAt: new Date(),
        canceledBy: `user:${userId}`,
        cancelReason: reason,
      },
    });

    return {
      message: refunded
        ? "Đã hủy buổi học và hoàn tiền"
        : hoursUntilSession <= 24
          ? "Đã hủy buổi học (không đủ điều kiện hoàn tiền vì còn dưới 24 giờ)"
          : "Đã hủy buổi học",
      refunded,
      refundAmountCents,
    };
  }
}
