import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";
import { PaymentMethodService } from "../payment-method/payment-method.service";
import { SubscriptionService } from "./subscription.service";

describe("SubscriptionService", () => {
  let service: SubscriptionService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock };
    subscriptionPlanConfig: { findUnique: jest.Mock };
    subscription: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let stripe: {
    createCustomer: jest.Mock;
    createSubscription: jest.Mock;
    cancelSubscription: jest.Mock;
    retrieveSubscription: jest.Mock;
    updateSubscription: jest.Mock;
  };

  const userId = 1;
  const mockUser = { id: userId, email: "user@test.com", name: "Test User" };

  beforeEach(async () => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn() },
      subscriptionPlanConfig: { findUnique: jest.fn() },
      subscription: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    stripe = {
      createCustomer: jest.fn(),
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      retrieveSubscription: jest.fn(),
      updateSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripe },
        { provide: RefundService, useValue: { refundPayment: jest.fn() } },
        {
          provide: PaymentMethodService,
          useValue: { assertUserOwnsCard: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(SubscriptionService);
    jest.clearAllMocks();
  });

  describe("createOrUpgrade — đã có subscription trên Stripe", () => {
    const stripeSub = (status: string, price: string) => ({
      id: "sub_old",
      status,
      customer: "cus_existing",
      items: { data: [{ id: "si_1", price: { id: price } }] },
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
      latest_invoice: { payment_intent: { client_secret: "pi_secret_old" } },
    });

    beforeEach(() => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: "price_pro",
        trialDays: 0,
      });
      prisma.subscription.findUnique.mockResolvedValue({
        userId,
        plan: SubscriptionPlan.BASIC,
        stripeCustomerId: "cus_existing",
        stripeSubscriptionId: "sub_old",
      });
      prisma.subscription.upsert.mockResolvedValue({});
    });

    it("chưa thanh toán xong cùng gói → DÙNG LẠI, không tạo subscription mới", async () => {
      stripe.retrieveSubscription.mockResolvedValue(
        stripeSub("incomplete", "price_pro"),
      );

      const res = await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(res).toEqual({
        clientSecret: "pi_secret_old",
        subscriptionId: "sub_old",
      });
      expect(stripe.createSubscription).not.toHaveBeenCalled();
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it("đang dùng đúng gói này → báo trùng, không tạo subscription thứ hai", async () => {
      stripe.retrieveSubscription.mockResolvedValue(
        stripeSub("active", "price_pro"),
      );

      await expect(
        service.createOrUpgrade(userId, SubscriptionPlan.PRO),
      ).rejects.toThrow(ConflictException);
      expect(stripe.createSubscription).not.toHaveBeenCalled();
    });

    it("nâng gói → đổi giá trên CHÍNH subscription cũ (bản cũ tạo cái thứ hai, gói cũ vẫn trừ tiền)", async () => {
      stripe.retrieveSubscription.mockResolvedValue(
        stripeSub("active", "price_basic"),
      );
      stripe.updateSubscription.mockResolvedValue(
        stripeSub("active", "price_pro"),
      );

      const res = await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(stripe.updateSubscription).toHaveBeenCalledWith(
        "sub_old",
        "price_pro",
      );
      expect(stripe.createSubscription).not.toHaveBeenCalled();
      expect(res).toEqual({
        clientSecret: null,
        subscriptionId: "sub_old",
        changedPlan: true,
      });
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            stripeSubscriptionId: "sub_old",
            stripePriceId: "price_pro",
          }),
        }),
      );
    });

    it("đổi sang gói khác khi cái cũ còn dở → hủy cái dở rồi mới tạo", async () => {
      stripe.retrieveSubscription.mockResolvedValue(
        stripeSub("incomplete", "price_basic"),
      );
      stripe.createSubscription.mockResolvedValue({
        ...stripeSub("incomplete", "price_pro"),
        id: "sub_new",
        latest_invoice: { payment_intent: { client_secret: "pi_new" } },
      });

      const res = await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(stripe.cancelSubscription).toHaveBeenCalledWith("sub_old", false);
      expect(res.subscriptionId).toBe("sub_new");
    });

    it("subscription cũ đã hủy → tạo mới với khóa idempotency theo người dùng + giá", async () => {
      stripe.retrieveSubscription.mockResolvedValue(
        stripeSub("canceled", "price_pro"),
      );
      stripe.createSubscription.mockResolvedValue({
        ...stripeSub("incomplete", "price_pro"),
        id: "sub_new",
      });

      await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(stripe.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: expect.stringMatching(
            /^subscription:user-1:price_pro:new-card:\d+$/,
          ),
        }),
      );
    });
  });

  describe("createOrUpgrade", () => {
    it("throws BadRequestException when plan has no stripePriceId", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: null,
      });

      await expect(
        service.createOrUpgrade(userId, SubscriptionPlan.PRO),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates new Stripe Customer when user has none", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: "price_pro",
        trialDays: 7,
      });
      prisma.subscription.findUnique.mockResolvedValue(null);
      stripe.createCustomer.mockResolvedValue({ id: "cus_new" });
      stripe.createSubscription.mockResolvedValue({
        id: "sub_new",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        latest_invoice: {
          payment_intent: { client_secret: "pi_secret_new" },
        },
      });
      prisma.subscription.upsert.mockResolvedValue({});

      await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(stripe.createCustomer).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        "customer:user-1", // gọi trùng → Stripe trả đúng customer cũ
      );
      expect(stripe.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "cus_new",
          priceId: "price_pro",
          trialDays: 7,
        }),
      );
    });

    it("reuses existing Stripe Customer when subscription exists", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: "price_pro",
        trialDays: 0,
      });
      prisma.subscription.findUnique.mockResolvedValue({
        userId,
        stripeCustomerId: "cus_existing",
      });
      stripe.createSubscription.mockResolvedValue({
        id: "sub_upgraded",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        latest_invoice: {
          payment_intent: { client_secret: "pi_secret_existing" },
        },
      });
      prisma.subscription.upsert.mockResolvedValue({});

      await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(stripe.createCustomer).not.toHaveBeenCalled();
      expect(stripe.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: "cus_existing" }),
      );
    });

    it("upserts subscription with TRIALING status", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: "price_pro",
        trialDays: 14,
      });
      prisma.subscription.findUnique.mockResolvedValue(null);
      stripe.createCustomer.mockResolvedValue({ id: "cus_1" });
      stripe.createSubscription.mockResolvedValue({
        id: "sub_1",
        status: "trialing",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_259_200,
        latest_invoice: {
          payment_intent: { client_secret: "pi_secret" },
        },
      });
      prisma.subscription.upsert.mockResolvedValue({});

      await service.createOrUpgrade(userId, SubscriptionPlan.PRO);

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
            plan: SubscriptionPlan.PRO,
            status: SubscriptionStatus.TRIALING,
            stripeCustomerId: "cus_1",
            stripeSubscriptionId: "sub_1",
          }),
        }),
      );
    });

    it("returns clientSecret and subscriptionId", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.subscriptionPlanConfig.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        stripePriceId: "price_pro",
        trialDays: 0,
      });
      prisma.subscription.findUnique.mockResolvedValue(null);
      stripe.createCustomer.mockResolvedValue({ id: "cus_1" });
      stripe.createSubscription.mockResolvedValue({
        id: "sub_return",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        latest_invoice: {
          payment_intent: { client_secret: "cs_test_secret" },
        },
      });
      prisma.subscription.upsert.mockResolvedValue({});

      const result = await service.createOrUpgrade(
        userId,
        SubscriptionPlan.PRO,
      );

      expect(result).toEqual({
        clientSecret: "cs_test_secret",
        subscriptionId: "sub_return",
      });
    });
  });

  describe("cancel", () => {
    it("throws BadRequestException when no stripeSubscriptionId", async () => {
      prisma.subscription.findUniqueOrThrow.mockResolvedValue({
        userId,
        stripeSubscriptionId: null,
      });

      await expect(service.cancel(userId)).rejects.toThrow(BadRequestException);
      expect(stripe.cancelSubscription).not.toHaveBeenCalled();
    });

    it("calls stripe.cancelSubscription with atPeriodEnd=true", async () => {
      prisma.subscription.findUniqueOrThrow.mockResolvedValue({
        userId,
        stripeSubscriptionId: "sub_cancel",
      });
      stripe.cancelSubscription.mockResolvedValue({});
      prisma.subscription.update.mockResolvedValue({});

      await service.cancel(userId);

      expect(stripe.cancelSubscription).toHaveBeenCalledWith(
        "sub_cancel",
        true,
      );
    });

    it("updates cancelAtPeriodEnd to true", async () => {
      prisma.subscription.findUniqueOrThrow.mockResolvedValue({
        userId,
        stripeSubscriptionId: "sub_cancel",
      });
      stripe.cancelSubscription.mockResolvedValue({});
      prisma.subscription.update.mockResolvedValue({});

      await service.cancel(userId);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });
    });
  });
});
