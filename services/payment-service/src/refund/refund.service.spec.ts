import { PaymentStatus, Role } from "@prisma/client";
import type { PrismaService } from "@app/prisma";
import type { StripeService } from "../stripe/stripe.service";
import { RefundService } from "./refund.service";

describe("RefundService.refundPayment", () => {
  const payment = {
    id: 7,
    userId: 1,
    amountCents: 10000,
    status: PaymentStatus.SUCCEEDED,
    stripeChargeId: "ch_1",
    sessionId: null,
    session: null,
    subscriptionId: 3,
    subscription: {},
    createdAt: new Date(),
    metadata: null,
  };
  let stripe: { refundPayment: jest.Mock };
  let service: RefundService;

  beforeEach(() => {
    stripe = { refundPayment: jest.fn(async () => ({ id: "re_1" })) };
    const prisma = {
      payment: {
        findUnique: jest.fn(async () => payment),
        update: jest.fn(async () => ({})),
      },
    };
    service = new RefundService(
      prisma as unknown as PrismaService,
      stripe as unknown as StripeService,
    );
  });

  it("gọi Stripe kèm idempotency key theo giao dịch (bấm hai lần không hoàn hai lần)", async () => {
    await service.refundPayment(7, { requestedByUserId: 1, role: Role.USER });
    await service.refundPayment(7, { requestedByUserId: 1, role: Role.USER });

    const keys = stripe.refundPayment.mock.calls.map((c) => c[2]);
    expect(keys).toEqual(["refund-payment-7", "refund-payment-7"]);
  });

  it("hoàn một phần (admin): cùng khóa theo giao dịch, Stripe từ chối lần hai khác số tiền", async () => {
    await service.refundPayment(7, {
      requestedByUserId: 99,
      role: Role.ADMIN,
      amountCents: 3000,
    });

    expect(stripe.refundPayment).toHaveBeenCalledWith(
      "ch_1",
      3000,
      "refund-payment-7",
    );
  });
});
