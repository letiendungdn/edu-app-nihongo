import { ForbiddenException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { BookingService } from "./booking/booking.service";
import { SessionChatService } from "./booking/session-chat.service";
import { RefundService } from "./refund/refund.service";

/**
 * IDOR: người dùng B không được đọc/sửa dữ liệu của người dùng A chỉ bằng cách đoán id.
 * Mỗi test: B thao tác trên bản ghi của A → phải bị từ chối, và KHÔNG có lệnh ghi nào chạy.
 */
const USER_A = 1;
const USER_B = 2;
const COACH_USER = 3;

describe("IDOR — buổi coaching", () => {
  const session = {
    id: 10,
    learnerId: USER_A,
    coach: { userId: COACH_USER },
    status: "CONFIRMED",
    scheduledAt: new Date(Date.now() + 72 * 3_600_000),
    payment: null,
  };

  it("B không đọc được tin nhắn buổi học của A", async () => {
    const prisma = {
      coachingSession: { findUnique: jest.fn().mockResolvedValue(session) },
      chatMessage: { findMany: jest.fn() },
    };
    const chat = new SessionChatService(prisma as never);
    await expect(chat.getMessages(10, USER_B)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
  });

  it("học viên A và coach của buổi đó thì đọc được", async () => {
    const prisma = {
      coachingSession: { findUnique: jest.fn().mockResolvedValue(session) },
      chatMessage: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const chat = new SessionChatService(prisma as never);
    await expect(chat.getMessages(10, USER_A)).resolves.toEqual([]);
    await expect(chat.getMessages(10, COACH_USER)).resolves.toEqual([]);
  });

  it("B không huỷ được buổi học của A", async () => {
    const prisma = {
      coachingSession: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(session),
        update: jest.fn(),
      },
    };
    const booking = new BookingService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await expect(booking.cancelSession(10, USER_B)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.coachingSession.update).not.toHaveBeenCalled();
  });
});

describe("IDOR — hoàn tiền", () => {
  const payment = {
    id: 50,
    userId: USER_A,
    status: "SUCCEEDED",
    session: null,
    subscription: null,
  };

  function refundService() {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn(),
      },
    };
    const stripe = { client: { refunds: { create: jest.fn() } } };
    return {
      svc: new RefundService(prisma as never, stripe as never),
      prisma,
      stripe,
    };
  }

  it("B không yêu cầu hoàn tiền giao dịch của A", async () => {
    const { svc, prisma, stripe } = refundService();
    await expect(
      svc.refundPayment(50, { requestedByUserId: USER_B, role: Role.USER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(stripe.client.refunds.create).not.toHaveBeenCalled();
  });
});
