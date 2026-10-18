import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { PaymentStatus, SessionStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";
import { BookingService } from "./booking.service";

describe("BookingService", () => {
  let service: BookingService;
  let refundService: { refundPayment: jest.Mock };
  let prisma: {
    coachProfile: { findUniqueOrThrow: jest.Mock };
    coachingSession: {
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    user: { findUniqueOrThrow: jest.Mock };
    payment: { update: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let stripe: {
    createCustomer: jest.Mock;
    createPaymentIntent: jest.Mock;
    refundPayment: jest.Mock;
  };

  const learnerId = 10;
  const coachId = 20;
  const scheduledAt = new Date("2026-08-01T10:00:00.000Z");

  beforeEach(async () => {
    prisma = {
      coachProfile: { findUniqueOrThrow: jest.fn() },
      coachingSession: {
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      user: { findUniqueOrThrow: jest.fn() },
      payment: { update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    stripe = {
      createCustomer: jest.fn(),
      createPaymentIntent: jest.fn(),
      refundPayment: jest.fn(),
    };
    refundService = { refundPayment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripe },
        { provide: RefundService, useValue: refundService },
      ],
    }).compile();

    service = module.get(BookingService);
    jest.clearAllMocks();
  });

  describe("bookSession", () => {
    it("throws BadRequestException when coach is not active", async () => {
      prisma.coachProfile.findUniqueOrThrow.mockResolvedValue({
        id: coachId,
        isActive: false,
        hourlyRateUsd: 5000,
        currency: "usd",
        user: { email: "coach@test.com" },
      });

      await expect(
        service.bookSession({ learnerId, coachId, scheduledAt }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException when slot is already booked", async () => {
      prisma.coachProfile.findUniqueOrThrow.mockResolvedValue({
        id: coachId,
        isActive: true,
        hourlyRateUsd: 5000,
        currency: "usd",
        user: { email: "coach@test.com" },
      });
      prisma.coachingSession.findFirst.mockResolvedValue({ id: 99 });

      await expect(
        service.bookSession({ learnerId, coachId, scheduledAt }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates session and payment in transaction", async () => {
      const mockSession = {
        id: 1,
        learnerId,
        coachId,
        scheduledAt,
        status: SessionStatus.PENDING,
        priceUsdCents: 5000,
      };

      prisma.coachProfile.findUniqueOrThrow.mockResolvedValue({
        id: coachId,
        isActive: true,
        hourlyRateUsd: 5000,
        currency: "usd",
        user: { email: "coach@test.com" },
      });
      prisma.coachingSession.findFirst.mockResolvedValue(null);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: learnerId,
        email: "learner@test.com",
        name: "Learner",
        subscription: { stripeCustomerId: "cus_learner" },
      });
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coachingSession: { create: jest.fn().mockResolvedValue(mockSession) },
          payment: { create: jest.fn().mockResolvedValue({ id: 100 }) },
        };
        return fn(tx);
      });
      stripe.createPaymentIntent.mockResolvedValue({
        id: "pi_123",
        client_secret: "cs_booking",
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.bookSession({
        learnerId,
        coachId,
        scheduledAt,
        topic: "N5",
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("creates Stripe PaymentIntent with correct amount", async () => {
      const mockSession = { id: 2, learnerId, coachId, scheduledAt };

      prisma.coachProfile.findUniqueOrThrow.mockResolvedValue({
        id: coachId,
        isActive: true,
        hourlyRateUsd: 7500,
        currency: "usd",
        user: { email: "coach@test.com" },
      });
      prisma.coachingSession.findFirst.mockResolvedValue(null);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: learnerId,
        email: "learner@test.com",
        name: null,
        subscription: { stripeCustomerId: "cus_learner" },
      });
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coachingSession: { create: jest.fn().mockResolvedValue(mockSession) },
          payment: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      stripe.createPaymentIntent.mockResolvedValue({
        id: "pi_amount",
        client_secret: "cs_amount",
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.bookSession({ learnerId, coachId, scheduledAt });

      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 7500,
          currency: "usd",
          customerId: "cus_learner",
          metadata: expect.objectContaining({
            sessionId: "2",
            coachId: coachId.toString(),
            learnerId: learnerId.toString(),
          }),
        }),
      );
    });

    it("saves stripePaymentIntentId on payment", async () => {
      const mockSession = { id: 3, learnerId, coachId, scheduledAt };

      prisma.coachProfile.findUniqueOrThrow.mockResolvedValue({
        id: coachId,
        isActive: true,
        hourlyRateUsd: 5000,
        currency: "usd",
        user: { email: "coach@test.com" },
      });
      prisma.coachingSession.findFirst.mockResolvedValue(null);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: learnerId,
        email: "learner@test.com",
        subscription: null,
      });
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coachingSession: { create: jest.fn().mockResolvedValue(mockSession) },
          payment: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      stripe.createCustomer.mockResolvedValue({ id: "cus_new_learner" });
      stripe.createPaymentIntent.mockResolvedValue({
        id: "pi_save",
        client_secret: "cs_save",
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.bookSession({ learnerId, coachId, scheduledAt });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 3 },
        data: { stripePaymentIntentId: "pi_save" },
      });
    });
  });

  describe("cancelSession", () => {
    it("throws BadRequestException when session is already COMPLETED", async () => {
      prisma.coachingSession.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        learnerId,
        status: SessionStatus.COMPLETED,
        scheduledAt: new Date("2026-08-01T10:00:00.000Z"),
        payment: null,
      });

      await expect(service.cancelSession(1, learnerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refunds when canceling more than 24h before session and payment succeeded", async () => {
      const futureDate = new Date(Date.now() + 48 * 3_600_000);

      prisma.coachingSession.findUniqueOrThrow.mockResolvedValue({
        id: 2,
        learnerId,
        status: SessionStatus.CONFIRMED,
        scheduledAt: futureDate,
        payment: {
          id: 50,
          stripeChargeId: "ch_refund",
          status: PaymentStatus.SUCCEEDED,
        },
      });
      refundService.refundPayment.mockResolvedValue({ amountCents: 5000 });
      prisma.coachingSession.update.mockResolvedValue({});

      const result = await service.cancelSession(2, learnerId, "changed plans");

      expect(refundService.refundPayment).toHaveBeenCalledWith(
        50,
        expect.objectContaining({
          requestedByUserId: learnerId,
          reason: "changed plans",
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ refunded: true, refundAmountCents: 5000 }),
      );
    });

    it("does not refund when canceling within 24h of session", async () => {
      const soonDate = new Date(Date.now() + 12 * 3_600_000);

      prisma.coachingSession.findUniqueOrThrow.mockResolvedValue({
        id: 3,
        learnerId,
        status: SessionStatus.CONFIRMED,
        scheduledAt: soonDate,
        payment: {
          id: 51,
          stripeChargeId: "ch_no_refund",
          status: PaymentStatus.SUCCEEDED,
        },
      });
      prisma.coachingSession.update.mockResolvedValue({});

      const result = await service.cancelSession(3, learnerId);

      expect(refundService.refundPayment).not.toHaveBeenCalled();
      expect(result.refunded).toBe(false);
    });

    it("updates session status to CANCELED", async () => {
      prisma.coachingSession.findUniqueOrThrow.mockResolvedValue({
        id: 4,
        learnerId,
        status: SessionStatus.PENDING,
        scheduledAt: new Date(Date.now() + 72 * 3_600_000),
        payment: null,
      });
      prisma.coachingSession.update.mockResolvedValue({});

      await service.cancelSession(4, learnerId, "no longer needed");

      expect(prisma.coachingSession.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: expect.objectContaining({
          status: SessionStatus.CANCELED,
          canceledBy: "user:10",
          cancelReason: "no longer needed",
        }),
      });
    });
  });
});
