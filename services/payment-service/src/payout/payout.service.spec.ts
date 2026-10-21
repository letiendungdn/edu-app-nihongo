import { Test, TestingModule } from "@nestjs/testing";
import { PaymentStatus, PayoutStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { PayoutService } from "./payout.service";
import { StripeService } from "../stripe/stripe.service";

describe("PayoutService", () => {
  let service: PayoutService;
  let prisma: {
    coachingSession: { findMany: jest.Mock };
    payout: { create: jest.Mock; groupBy: jest.Mock };
    payment: { groupBy: jest.Mock };
  };
  let stripe: { transferToCoach: jest.Mock };

  beforeEach(async () => {
    prisma = {
      coachingSession: { findMany: jest.fn().mockResolvedValue([]) },
      payout: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      payment: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    stripe = { transferToCoach: jest.fn().mockResolvedValue({ id: "tr_1" }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(PayoutService);
  });

  // Luồng trả tiền (gom buổi, chống trả trùng, thử lại) chạy SQL thật: xem payout.db-spec.ts

  describe("getReconciliationReport", () => {
    it("aggregates revenue, payouts and platform fees", async () => {
      prisma.payment.groupBy.mockResolvedValue([
        {
          status: PaymentStatus.SUCCEEDED,
          _sum: { amountCents: 10000 },
          _count: { id: 2 },
        },
      ]);
      prisma.payout.groupBy.mockResolvedValue([
        {
          status: PayoutStatus.PAID,
          _sum: { amountCents: 6000, feeAmountCents: 1500 },
          _count: { id: 1 },
        },
      ]);

      const start = new Date("2026-06-01");
      const end = new Date("2026-06-30");
      const report = await service.getReconciliationReport(start, end);

      expect(report.totalRevenueCents).toBe(10000);
      expect(report.totalPayoutsCents).toBe(6000);
      expect(report.platformFeesCents).toBe(1500);
      expect(report.netPlatformCents).toBe(4000);
    });
  });
});
