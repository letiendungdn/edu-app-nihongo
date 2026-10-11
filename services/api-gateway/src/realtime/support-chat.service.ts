import { ForbiddenException, Injectable } from "@nestjs/common";
import { NotificationType, Role } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { NotificationService } from "./notification.service";
import { ChatEventsService } from "./chat-events.service";

const senderSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
} as const;

@Injectable()
export class SupportChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  threadRoom(threadId: number) {
    return `support:thread:${threadId}`;
  }

  async getOrCreateThread(userId: number) {
    return this.prisma.supportThread.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { user: { select: senderSelect } },
    });
  }

  async assertCanAccess(
    threadId: number,
    userId: number,
    role: Role,
  ): Promise<{ threadId: number; userId: number }> {
    const thread = await this.prisma.supportThread.findUniqueOrThrow({
      where: { id: threadId },
      select: { id: true, userId: true },
    });
    if (role === Role.ADMIN || thread.userId === userId) {
      return { threadId: thread.id, userId: thread.userId };
    }
    throw new ForbiddenException("Không có quyền truy cập hội thoại này");
  }

  async saveMessage(
    threadId: number,
    senderId: number,
    content: string,
    fileUrl?: string,
    fileType?: string,
  ) {
    const message = await this.prisma.supportMessage.create({
      data: { threadId, senderId, content, fileUrl, fileType },
      include: { sender: { select: senderSelect } },
    });

    await this.prisma.supportThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    const thread = await this.prisma.supportThread.findUniqueOrThrow({
      where: { id: threadId },
      include: { user: { select: senderSelect } },
    });

    const isFromUser = thread.userId === senderId;

    const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content;

    if (!isFromUser) {
      await this.notifications.send({
        userId: thread.userId,
        type: NotificationType.SUPPORT_MESSAGE,
        title: "Admin đã trả lời",
        body: preview,
        metadata: { threadId, messageId: message.id },
      });
      this.chatEvents.notifyUsers([thread.userId], {
        type: "SUPPORT_MESSAGE",
        threadId,
        messageId: message.id,
        preview,
      });
    }

    this.chatEvents.emit({ type: "support", roomId: threadId, message });

    return { message, thread, isFromUser };
  }

  async getHistory(
    threadId: number,
    userId: number,
    role: Role,
    cursor?: number,
  ) {
    await this.assertCanAccess(threadId, userId, role);
    return this.prisma.supportMessage.findMany({
      where: {
        threadId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { sender: { select: senderSelect } },
    });
  }

  async markRead(threadId: number, readerId: number, role: Role) {
    await this.assertCanAccess(threadId, readerId, role);
    await this.prisma.supportMessage.updateMany({
      where: { threadId, readAt: null, NOT: { senderId: readerId } },
      data: { readAt: new Date() },
    });
  }

  async getUserThread(userId: number) {
    const thread = await this.getOrCreateThread(userId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { sender: { select: senderSelect } },
    });
    return { thread, messages };
  }

  async listThreadsForAdmin() {
    const threads = await this.prisma.supportThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      include: {
        user: { select: senderSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: senderSelect } },
        },
      },
    });

    const adminIds = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    const adminIdSet = new Set(adminIds.map((a) => a.id));

    return Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.supportMessage.count({
          where: {
            threadId: thread.id,
            readAt: null,
            senderId: { notIn: [...adminIdSet] },
          },
        });
        return {
          id: thread.id,
          userId: thread.userId,
          lastMessageAt: thread.lastMessageAt,
          user: thread.user,
          lastMessage: thread.messages[0] ?? null,
          unreadCount,
        };
      }),
    );
  }

  async getThreadForAdmin(threadId: number) {
    const thread = await this.prisma.supportThread.findUniqueOrThrow({
      where: { id: threadId },
      include: { user: { select: senderSelect } },
    });
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: senderSelect } },
    });
    return { thread, messages };
  }
}
