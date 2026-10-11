import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LearnerChatMemberRole,
  LearnerChatRoomType,
  NotificationType,
  Role,
} from "@prisma/client";
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

const memberInclude = {
  user: { select: senderSelect },
} as const;

@Injectable()
export class GroupChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  roomSocket(roomId: number) {
    return `group:room:${roomId}`;
  }

  async assertMember(roomId: number, userId: number) {
    const member = await this.prisma.learnerChatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) {
      throw new ForbiddenException("Bạn không phải thành viên nhóm này");
    }
    return member;
  }

  async listRoomsForUser(userId: number) {
    const memberships = await this.prisma.learnerChatMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: { include: memberInclude },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: senderSelect } },
            },
          },
        },
      },
      orderBy: { room: { lastMessageAt: "desc" } },
    });

    return Promise.all(
      memberships.map(async ({ room }) => {
        const unreadCount = await this.prisma.learnerChatMessage.count({
          where: {
            roomId: room.id,
            readAt: null,
            NOT: { senderId: userId },
          },
        });

        const displayName = this.resolveRoomName(room, userId);

        return {
          id: room.id,
          name: displayName,
          type: room.type,
          lastMessageAt: room.lastMessageAt,
          members: room.members.map((m) => m.user),
          lastMessage: room.messages[0] ?? null,
          unreadCount,
        };
      }),
    );
  }

  private resolveRoomName(
    room: {
      name: string | null;
      type: LearnerChatRoomType;
      members: { user: { id: number; name: string | null; email: string } }[];
    },
    currentUserId: number,
  ) {
    if (room.type === LearnerChatRoomType.GROUP && room.name) {
      return room.name;
    }
    const others = room.members
      .map((m) => m.user)
      .filter((u) => u.id !== currentUserId);
    if (others.length === 0) return "Hội thoại";
    return others.map((u) => u.name ?? u.email).join(", ");
  }

  async getRoomDetail(roomId: number, userId: number) {
    await this.assertMember(roomId, userId);
    const room = await this.prisma.learnerChatRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        members: { include: memberInclude },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
          include: { sender: { select: senderSelect } },
        },
      },
    });
    return {
      room: {
        id: room.id,
        name: this.resolveRoomName(room, userId),
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        members: room.members.map((m) => ({
          ...m.user,
          memberRole: m.role,
          joinedAt: m.joinedAt,
        })),
      },
      messages: room.messages,
    };
  }

  async findOrCreateDirect(userId: number, otherUserId: number) {
    if (userId === otherUserId) {
      throw new BadRequestException("Không thể chat với chính mình");
    }

    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, role: true },
    });
    if (!other) throw new NotFoundException("Người dùng không tồn tại");
    if (other.role === Role.ADMIN) {
      throw new BadRequestException("Dùng trang Hỗ trợ để liên hệ admin");
    }

    const existing = await this.prisma.learnerChatRoom.findFirst({
      where: {
        type: LearnerChatRoomType.DIRECT,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: { members: { include: memberInclude } },
    });
    if (existing) return existing;

    return this.prisma.learnerChatRoom.create({
      data: {
        type: LearnerChatRoomType.DIRECT,
        createdById: userId,
        members: {
          create: [
            { userId, role: LearnerChatMemberRole.MEMBER },
            { userId: otherUserId, role: LearnerChatMemberRole.MEMBER },
          ],
        },
      },
      include: { members: { include: memberInclude } },
    });
  }

  async createGroup(creatorId: number, name: string, memberUserIds: number[]) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("Tên nhóm không được trống");

    const uniqueIds = [
      ...new Set(memberUserIds.filter((id) => id !== creatorId)),
    ];
    if (uniqueIds.length === 0) {
      throw new BadRequestException("Cần ít nhất một thành viên khác");
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, role: Role.USER },
      select: { id: true },
    });
    if (users.length !== uniqueIds.length) {
      throw new BadRequestException("Một số thành viên không hợp lệ");
    }

    return this.prisma.learnerChatRoom.create({
      data: {
        name: trimmed,
        type: LearnerChatRoomType.GROUP,
        createdById: creatorId,
        members: {
          create: [
            { userId: creatorId, role: LearnerChatMemberRole.ADMIN },
            ...uniqueIds.map((id) => ({
              userId: id,
              role: LearnerChatMemberRole.MEMBER,
            })),
          ],
        },
      },
      include: { members: { include: memberInclude } },
    });
  }

  async addMembers(roomId: number, actorId: number, memberUserIds: number[]) {
    const actor = await this.assertMember(roomId, actorId);
    const room = await this.prisma.learnerChatRoom.findUniqueOrThrow({
      where: { id: roomId },
    });
    if (room.type !== LearnerChatRoomType.GROUP) {
      throw new BadRequestException("Chỉ thêm thành viên vào nhóm");
    }
    if (actor.role !== LearnerChatMemberRole.ADMIN) {
      throw new ForbiddenException("Chỉ admin nhóm mới thêm được thành viên");
    }

    const uniqueIds = [...new Set(memberUserIds)];
    const existing = await this.prisma.learnerChatMember.findMany({
      where: { roomId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const existingSet = new Set(
      existing.map((e: { userId: number }) => e.userId),
    );
    const toAdd = uniqueIds.filter((id) => !existingSet.has(id));
    if (!toAdd.length) return { added: 0 };

    await this.prisma.learnerChatMember.createMany({
      data: toAdd.map((userId) => ({
        roomId,
        userId,
        role: LearnerChatMemberRole.MEMBER,
      })),
    });

    return { added: toAdd.length };
  }

  async getOnlineUsers(currentUserId: number, onlineIds: number[]) {
    const ids = onlineIds.filter((id) => id !== currentUserId);
    if (!ids.length) return [];

    return this.prisma.user.findMany({
      where: {
        id: { in: ids },
        role: Role.USER,
      },
      select: senderSelect,
      orderBy: { name: "asc" },
    });
  }

  async searchUsers(query: string, excludeUserId: number) {
    const q = query.trim();
    if (q.length < 2) return [];

    return this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        role: Role.USER,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: senderSelect,
      take: 20,
      orderBy: { name: "asc" },
    });
  }

  async saveMessage(
    roomId: number,
    senderId: number,
    content: string,
    fileUrl?: string,
    fileType?: string,
  ) {
    await this.assertMember(roomId, senderId);

    const message = await this.prisma.learnerChatMessage.create({
      data: { roomId, senderId, content, fileUrl, fileType },
      include: { sender: { select: senderSelect } },
    });

    await this.prisma.learnerChatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() },
    });

    const members = await this.prisma.learnerChatMember.findMany({
      where: { roomId, NOT: { userId: senderId } },
      select: { userId: true },
    });

    const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content;

    await Promise.all(
      members.map((m: { userId: number }) =>
        this.notifications.send({
          userId: m.userId,
          type: NotificationType.GROUP_MESSAGE,
          title: "Tin nhắn mới",
          body: preview,
          metadata: { roomId, messageId: message.id },
        }),
      ),
    );

    this.chatEvents.emit({ type: "community", roomId, message });
    this.chatEvents.notifyUsers(
      members.map((member) => member.userId),
      {
        type: "GROUP_MESSAGE",
        roomId,
        messageId: message.id,
        preview,
      },
    );

    return message;
  }

  async getHistory(roomId: number, userId: number, cursor?: number) {
    await this.assertMember(roomId, userId);
    return this.prisma.learnerChatMessage.findMany({
      where: {
        roomId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { sender: { select: senderSelect } },
    });
  }

  async markRead(roomId: number, readerId: number) {
    await this.assertMember(roomId, readerId);
    await this.prisma.learnerChatMessage.updateMany({
      where: { roomId, readAt: null, NOT: { senderId: readerId } },
      data: { readAt: new Date() },
    });
  }

  async getMemberUserIds(roomId: number) {
    const members = await this.prisma.learnerChatMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m: { userId: number }) => m.userId);
  }
}
