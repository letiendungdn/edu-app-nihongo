import { PrismaClient } from "@prisma/client";

/** Xóa dữ liệu các bảng test đụng tới (đúng thứ tự khóa ngoại). */
export async function resetTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Payment", "CoachingSession", "Payout", "CoachProfile", "RefreshToken", "SrsCard", "CronRun", "OutboxEvent", "User" RESTART IDENTITY CASCADE`,
  );
}

let seq = 0;

export async function createUser(prisma: PrismaClient, email?: string) {
  seq += 1;
  return prisma.user.create({
    data: { email: email ?? `u${seq}-${Date.now()}@test.local` },
  });
}

export async function createCoach(
  prisma: PrismaClient,
  opts: { stripeAccountId?: string | null; payoutEnabled?: boolean } = {},
) {
  const user = await createUser(prisma);
  return prisma.coachProfile.create({
    data: {
      userId: user.id,
      hourlyRateUsd: 5000,
      stripeAccountId:
        opts.stripeAccountId === undefined
          ? `acct_test_${user.id}`
          : opts.stripeAccountId,
      payoutEnabled: opts.payoutEnabled ?? true,
    },
  });
}

/** Buổi học kèm Payment. */
export async function createSession(
  prisma: PrismaClient,
  opts: {
    coachId: number;
    learnerId: number;
    scheduledAt: Date;
    status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
    priceUsdCents?: number;
    platformFeePercent?: number;
    paymentStatus?: "PENDING" | "SUCCEEDED" | "REFUNDED";
  },
) {
  const session = await prisma.coachingSession.create({
    data: {
      coachId: opts.coachId,
      learnerId: opts.learnerId,
      scheduledAt: opts.scheduledAt,
      status: opts.status ?? "CONFIRMED",
      priceUsdCents: opts.priceUsdCents ?? 5000,
      platformFeePercent: opts.platformFeePercent ?? 20,
    },
  });
  await prisma.payment.create({
    data: {
      userId: opts.learnerId,
      amountCents: session.priceUsdCents,
      status: opts.paymentStatus ?? "SUCCEEDED",
      sessionId: session.id,
    },
  });
  return session;
}
