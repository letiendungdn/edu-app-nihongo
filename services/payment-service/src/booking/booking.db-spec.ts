import { ConflictException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import type { StripeService } from "../stripe/stripe.service";
import type { RefundService } from "../refund/refund.service";
import { BOOKING_LOCK_NAMESPACE, BookingService } from "./booking.service";
import {
  createCoach,
  createUser,
  resetTables,
} from "../../../test/db-fixtures";

describe("Đặt buổi coach (Postgres thật)", () => {
  const prisma = new PrismaService();
  const stripe = {
    createCustomer: jest.fn().mockResolvedValue({ id: "cus_1" }),
    createPaymentIntent: jest.fn(() =>
      Promise.resolve({
        id: `pi_${Math.random()}`,
        client_secret: "pi_secret",
      }),
    ),
  } as unknown as StripeService;
  const booking = new BookingService(prisma, stripe, {} as RefundService);
  const at = (iso: string) => new Date(iso);

  beforeEach(async () => {
    await resetTables(prisma);
  });
  afterAll(() => prisma.$disconnect());

  async function setup() {
    const coach = await createCoach(prisma);
    await prisma.coachProfile.update({
      where: { id: coach.id },
      data: { isActive: true },
    });
    return coach;
  }

  it("hai người đặt CÙNG slot CÙNG LÚC → đúng một người được (bản cũ: cả hai)", async () => {
    const coach = await setup();
    const [a, b] = [await createUser(prisma), await createUser(prisma)];
    const slot = at("2026-11-01T10:00:00Z");

    const results = await Promise.allSettled([
      booking.bookSession({
        learnerId: a.id,
        coachId: coach.id,
        scheduledAt: slot,
      }),
      booking.bookSession({
        learnerId: b.id,
        coachId: coach.id,
        scheduledAt: slot,
      }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(await prisma.coachingSession.count()).toBe(1);
  });

  it("đang có người đặt dở cùng slot (transaction chưa commit) → người sau chờ rồi bị từ chối", async () => {
    const coach = await setup();
    const [a, b] = [await createUser(prisma), await createUser(prisma)];
    const slot = at("2026-11-01T10:00:00Z");
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Người A: đã giữ khóa coach, đã ghi buổi nhưng CHƯA commit
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_NAMESPACE}::int, ${coach.id}::int)`;
        await tx.coachingSession.create({
          data: {
            coachId: coach.id,
            learnerId: a.id,
            scheduledAt: slot,
            priceUsdCents: 5000,
          },
        });
        await gate;
      },
      { timeout: 15_000 },
    );
    await sleep(200);
    const attempt = booking.bookSession({
      learnerId: b.id,
      coachId: coach.id,
      scheduledAt: slot,
    });
    const settled = attempt.then(
      () => "ok",
      () => "rejected",
    );
    await sleep(800);
    release();
    await holder;

    await expect(attempt).rejects.toThrow(ConflictException);
    expect(await settled).toBe("rejected");
    expect(await prisma.coachingSession.count()).toBe(1);
  });

  it("khung giờ CHỒNG nhau (10:00 và 10:30, buổi 60 phút) → từ chối; 11:00 thì được", async () => {
    const coach = await setup();
    const learner = await createUser(prisma);
    await booking.bookSession({
      learnerId: learner.id,
      coachId: coach.id,
      scheduledAt: at("2026-11-01T10:00:00Z"),
    });

    await expect(
      booking.bookSession({
        learnerId: learner.id,
        coachId: coach.id,
        scheduledAt: at("2026-11-01T10:30:00Z"),
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      booking.bookSession({
        learnerId: learner.id,
        coachId: coach.id,
        scheduledAt: at("2026-11-01T11:00:00Z"),
      }),
    ).resolves.toBeDefined();
  });

  it("slot của buổi đã HỦY đặt lại được", async () => {
    const coach = await setup();
    const learner = await createUser(prisma);
    const slot = at("2026-11-01T10:00:00Z");
    const first = await booking.bookSession({
      learnerId: learner.id,
      coachId: coach.id,
      scheduledAt: slot,
    });
    await prisma.coachingSession.update({
      where: { id: first.session.id },
      data: { status: "CANCELED" },
    });

    await expect(
      booking.bookSession({
        learnerId: learner.id,
        coachId: coach.id,
        scheduledAt: slot,
      }),
    ).resolves.toBeDefined();
  });
});
