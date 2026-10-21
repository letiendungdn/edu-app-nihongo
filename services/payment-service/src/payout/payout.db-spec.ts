import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";
import { PayoutService } from "./payout.service";
import {
  createCoach,
  createSession,
  createUser,
  resetTables,
} from "../../../test/db-fixtures";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-10-21T03:00:00Z");
const ago = (hours: number) => new Date(now.getTime() - hours * HOUR);

describe("PayoutService (Postgres thật)", () => {
  const prisma = new PrismaService();
  let transfers: { amountCents: number; idempotencyKey?: string }[];
  let failNext: boolean;
  const stripe = {
    transferToCoach: jest.fn(
      (p: { amountCents: number; idempotencyKey?: string }) => {
        transfers.push(p);
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error("Stripe 500"));
        }
        return Promise.resolve({ id: `tr_${transfers.length}` });
      },
    ),
  } as unknown as StripeService;
  const service = new PayoutService(prisma, stripe);

  beforeEach(async () => {
    await resetTables(prisma);
    transfers = [];
    failNext = false;
  });

  afterAll(() => prisma.$disconnect());

  it("buổi CONFIRMED đã thanh toán, kết thúc quá 24 giờ → COMPLETED; chưa đủ 24 giờ thì chưa", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    const old = await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
    });
    const recent = await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(10),
    });
    const unpaid = await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      paymentStatus: "PENDING",
    });

    expect(await service.completeFinishedSessions(now)).toBe(1);

    const status = async (id: number) =>
      (await prisma.coachingSession.findUniqueOrThrow({ where: { id } }))
        .status;
    expect(await status(old.id)).toBe("COMPLETED");
    expect(await status(recent.id)).toBe("CONFIRMED");
    expect(await status(unpaid.id)).toBe("CONFIRMED");
  });

  it("chạy HAI lần → chỉ trả MỘT lần (bản cũ trả gấp đôi)", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      priceUsdCents: 10000,
    });

    await service.runPayouts(now);
    await service.runPayouts(now);

    expect(transfers).toHaveLength(1);
    expect(transfers[0].amountCents).toBe(8000);
    expect(transfers[0].idempotencyKey).toMatch(/^payout-\d+$/);
    const payouts = await prisma.payout.findMany();
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      status: "PAID",
      grossAmountCents: 10000,
      feeAmountCents: 2000,
      sessionCount: 1,
    });
  });

  it("lượt chạy đọc danh sách CŨ (pod khác vừa giành xong) → không giành lại buổi đã thuộc lượt khác", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    for (let i = 0; i < 3; i++) {
      await createSession(prisma, {
        coachId: coach.id,
        learnerId: learner.id,
        scheduledAt: ago(30 + i),
        status: "COMPLETED",
      });
    }
    // Pod B đọc danh sách buổi chưa trả TRƯỚC khi pod A giành xong (race thật giữa hai pod)
    const stale = await prisma.coachingSession.findMany({
      select: { id: true, coachId: true },
    });
    await service.createPayouts(); // pod A giành cả 3
    const spy = jest
      .spyOn(prisma.coachingSession, "findMany")
      .mockResolvedValueOnce(stale as never);
    const created = await service.createPayouts(); // pod B với danh sách cũ
    spy.mockRestore();

    expect(created).toEqual([]); // không tạo lượt thứ hai
    const payouts = await prisma.payout.findMany();
    expect(payouts).toHaveLength(1);
    expect(payouts[0].sessionCount).toBe(3);
    const owners = new Set(
      (await prisma.coachingSession.findMany()).map((s) => s.payoutId),
    );
    expect([...owners]).toEqual([payouts[0].id]);
  });

  it("buổi xong từ lâu (quá 7 ngày) vẫn được trả (bản cũ chỉ nhìn 7 ngày gần nhất)", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(24 * 30),
      status: "COMPLETED",
    });

    const summary = await service.runPayouts(now);

    expect(summary.paid).toBe(1);
  });

  it("phí tính theo TỪNG buổi (bản cũ lấy % của buổi đầu cho cả lô)", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(40),
      status: "COMPLETED",
      priceUsdCents: 10000,
      platformFeePercent: 20,
    });
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      status: "COMPLETED",
      priceUsdCents: 10000,
      platformFeePercent: 10,
    });

    await service.runPayouts(now);

    const [payout] = await prisma.payout.findMany();
    expect(payout).toMatchObject({
      grossAmountCents: 20000,
      feeAmountCents: 3000,
      amountCents: 17000,
    });
  });

  it("chuyển tiền lỗi → lượt FAILED, lần sau thử lại ĐÚNG lượt đó với cùng idempotency key", async () => {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      status: "COMPLETED",
    });
    failNext = true;

    const first = await service.runPayouts(now);
    expect(first).toMatchObject({ created: 1, failed: 1, paid: 0 });
    expect((await prisma.payout.findFirstOrThrow()).status).toBe("FAILED");

    const second = await service.runPayouts(now);
    expect(second).toMatchObject({ created: 0, paid: 1 });
    expect(transfers.map((t) => t.idempotencyKey)).toEqual([
      transfers[0].idempotencyKey,
      transfers[0].idempotencyKey,
    ]);
    expect(await prisma.payout.count()).toBe(1);
    expect((await prisma.payout.findFirstOrThrow()).status).toBe("PAID");
  });

  it("buổi đã hoàn tiền hoặc coach chưa bật nhận tiền → không trả", async () => {
    const coach = await createCoach(prisma);
    const disabled = await createCoach(prisma, { payoutEnabled: false });
    const learner = await createUser(prisma);
    await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      status: "COMPLETED",
      paymentStatus: "REFUNDED",
    });
    await createSession(prisma, {
      coachId: disabled.id,
      learnerId: learner.id,
      scheduledAt: ago(30),
      status: "COMPLETED",
    });

    await service.runPayouts(now);

    expect(transfers).toHaveLength(0);
  });
});
