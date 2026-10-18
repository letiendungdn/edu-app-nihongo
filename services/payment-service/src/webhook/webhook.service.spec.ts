import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";
import { RefundService } from "../refund/refund.service";
import { KafkaProducerService } from "../kafka/kafka-producer.service";
import { NotificationService } from "../../../api-gateway/src/realtime/notification.service";
import { WebhookService } from "./webhook.service";

describe("WebhookService", () => {
  let service: WebhookService;
  let prisma: {
    webhookEvent: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    subscription: { updateMany: jest.Mock; findFirst: jest.Mock };
    payment: { updateMany: jest.Mock; findMany: jest.Mock };
  };
  let stripe: { constructWebhookEvent: jest.Mock };

  const rawBody = Buffer.from("{}");
  const signature = "sig_test";

  beforeEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    prisma = {
      webhookEvent: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscription: {
        updateMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      payment: { updateMany: jest.fn(), findMany: jest.fn() },
    };
    stripe = { constructWebhookEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripe },
        { provide: RefundService, useValue: { refundByChargeId: jest.fn() } },
        {
          provide: KafkaProducerService,
          useValue: { emit: jest.fn(), send: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyUser: jest.fn(), create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WebhookService);
    jest.clearAllMocks();
  });

  describe("handleStripeEvent", () => {
    it("throws BadRequestException when signature is invalid", async () => {
      stripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        service.handleStripeEvent(rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it("skips event already marked PROCESSED (idempotency)", async () => {
      const event = {
        id: "evt_processed",
        type: "payment_intent.succeeded",
      } as unknown as Stripe.Event;
      stripe.constructWebhookEvent.mockReturnValue(event);
      prisma.webhookEvent.findUnique.mockResolvedValue({ status: "PROCESSED" });

      await service.handleStripeEvent(rawBody, signature);

      expect(prisma.webhookEvent.upsert).not.toHaveBeenCalled();
    });

    it("saves webhook record before processing", async () => {
      const event = {
        id: "evt_new",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            status: "active",
            current_period_start: 1_700_000_000,
            current_period_end: 1_700_086_400,
            cancel_at_period_end: false,
            canceled_at: null,
          },
        },
      } as unknown as Stripe.Event;

      stripe.constructWebhookEvent.mockReturnValue(event);
      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      prisma.webhookEvent.upsert.mockResolvedValue({ id: 1 });
      prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      prisma.webhookEvent.update.mockResolvedValue({});

      await service.handleStripeEvent(rawBody, signature);

      expect(prisma.webhookEvent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: "evt_new" },
          create: expect.objectContaining({
            eventId: "evt_new",
            status: "RECEIVED",
          }),
        }),
      );
      expect(prisma.subscription.updateMany).toHaveBeenCalled();
    });

    it("updates status to PROCESSED after successful processing", async () => {
      const event = {
        id: "evt_ok",
        type: "payment_intent.succeeded",
        data: {
          object: { id: "pi_ok", latest_charge: "ch_ok" },
        },
      } as unknown as Stripe.Event;

      stripe.constructWebhookEvent.mockReturnValue(event);
      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      prisma.webhookEvent.upsert.mockResolvedValue({ id: 2 });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.webhookEvent.update.mockResolvedValue({});

      await service.handleStripeEvent(rawBody, signature);

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: expect.objectContaining({ status: "PROCESSED" }),
      });
    });

    it("updates status to FAILED when processEvent throws", async () => {
      const event = {
        id: "evt_fail",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_fail" } },
      } as unknown as Stripe.Event;

      stripe.constructWebhookEvent.mockReturnValue(event);
      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      prisma.webhookEvent.upsert.mockResolvedValue({ id: 3 });
      prisma.payment.updateMany.mockRejectedValue(new Error("DB error"));
      prisma.webhookEvent.update.mockResolvedValue({});

      await expect(
        service.handleStripeEvent(rawBody, signature),
      ).rejects.toThrow("DB error");

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "DB error",
        }),
      });
    });
  });

  describe("handleSubscriptionChange", () => {
    const callHandleSubscriptionChange = (sub: Partial<Stripe.Subscription>) =>
      (
        service as unknown as {
          handleSubscriptionChange: (s: Stripe.Subscription) => Promise<void>;
        }
      ).handleSubscriptionChange(sub as unknown as Stripe.Subscription);

    it("maps 'active' status to ACTIVE", async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await callHandleSubscriptionChange({
        id: "sub_active",
        status: "active",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Partial<Stripe.Subscription>);

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SubscriptionStatus.ACTIVE }),
        }),
      );
    });

    it("maps 'past_due' status to PAST_DUE", async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await callHandleSubscriptionChange({
        id: "sub_past_due",
        status: "past_due",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Partial<Stripe.Subscription>);

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.PAST_DUE,
          }),
        }),
      );
    });

    it("maps 'canceled' status to CANCELED", async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await callHandleSubscriptionChange({
        id: "sub_canceled",
        status: "canceled",
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        cancel_at_period_end: true,
        canceled_at: 1_700_050_000,
      } as unknown as Partial<Stripe.Subscription>);

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.CANCELED,
          }),
        }),
      );
    });

    it("updates currentPeriodEnd from Stripe subscription", async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      const periodEnd = 1_700_259_200;

      await callHandleSubscriptionChange({
        id: "sub_period",
        status: "active",
        current_period_start: 1_700_000_000,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Partial<Stripe.Subscription>);

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPeriodEnd: new Date(periodEnd * 1000),
          }),
        }),
      );
    });
  });

  describe("handlePaymentSucceeded", () => {
    const callHandlePaymentSucceeded = (
      intent: Partial<Stripe.PaymentIntent>,
    ) =>
      (
        service as unknown as {
          handlePaymentSucceeded: (i: Stripe.PaymentIntent) => Promise<void>;
        }
      ).handlePaymentSucceeded(intent as Stripe.PaymentIntent);

    it("updates Payment status to SUCCEEDED", async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findMany.mockResolvedValue([]);

      await callHandlePaymentSucceeded({ id: "pi_success" });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: "pi_success" },
        data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
      });
    });

    it("saves stripeChargeId from latest_charge", async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findMany.mockResolvedValue([]);

      await callHandlePaymentSucceeded({
        id: "pi_charge",
        latest_charge: "ch_saved",
      });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: "pi_charge" },
        data: expect.objectContaining({ stripeChargeId: "ch_saved" }),
      });
    });
  });
});
