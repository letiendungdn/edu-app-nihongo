import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Role, type Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  MAIL_PORT,
  type MailAttachment,
  type MailPort,
  type MailTemplateStore,
} from "@app/common/mail/mail.port";
import { MailService } from "@app/common/mail/mail.service";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  TEMPLATE_SAMPLE_VARS,
} from "./email-template.defaults";
import type { UpdateEmailTemplateDto } from "./dto/update-email-template.dto";
import type {
  BroadcastFilterDto,
  ComposeDto,
  SendToUserDto,
} from "./dto/send-email.dto";
import {
  EMAIL_BROADCAST_QUEUE,
  type ComposeJobData,
  type SendTemplateJobData,
} from "./email-broadcast.types";

const COMPOSE_INLINE_LIMIT = 20;

@Injectable()
export class EmailTemplateService implements MailTemplateStore {
  constructor(
    private readonly prisma: PrismaService,
    // MailService optionally injects MAIL_TEMPLATE_STORE (= this) → circular DI
    @Inject(forwardRef(() => MailService)) private readonly mail: MailService,
    @Inject(MAIL_PORT) private readonly mailPort: MailPort,
    @InjectQueue(EMAIL_BROADCAST_QUEUE) private readonly broadcastQueue: Queue,
  ) {}

  // ─── MailTemplateStore implementation ─────────────────────────────────────

  async findActive(name: string) {
    const tpl = await this.prisma.emailTemplate.findFirst({
      where: { name, active: true },
      select: {
        subject: true,
        htmlBody: true,
        textBody: true,
        attachments: true,
      },
    });
    if (!tpl) return null;
    return {
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      textBody: tpl.textBody,
      attachments:
        (tpl.attachments as Array<{ filename: string; url: string }>) ?? [],
    };
  }

  // ─── Admin: list ──────────────────────────────────────────────────────────

  async listAll() {
    const dbTemplates = await this.prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        subject: true,
        active: true,
        updatedById: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    const dbMap = new Map(dbTemplates.map((t) => [t.name, t]));

    return EMAIL_TEMPLATE_DEFAULTS.map((def) => {
      const db = dbMap.get(def.name);
      return {
        name: def.name,
        description: db?.description ?? def.description,
        subject: db?.subject ?? def.subject,
        hasOverride: !!db,
        active: db?.active ?? true,
        variables: def.variables,
        updatedAt: db?.updatedAt ?? null,
        updatedById: db?.updatedById ?? null,
      };
    });
  }

  // ─── Admin: get one ───────────────────────────────────────────────────────

  async findOne(name: string) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === name);
    if (!def) throw new NotFoundException(`Template '${name}' không tồn tại`);

    const db = await this.prisma.emailTemplate.findUnique({ where: { name } });

    return {
      name,
      description: db?.description ?? def.description,
      subject: db?.subject ?? def.subject,
      htmlBody: db?.htmlBody ?? def.htmlBody,
      textBody: db?.textBody ?? def.textBody,
      variables: def.variables,
      attachments: (db?.attachments as unknown[]) ?? [],
      active: db?.active ?? true,
      hasOverride: !!db,
      // Hardcoded defaults shown as reference
      defaults: {
        subject: def.subject,
        htmlBody: def.htmlBody,
        textBody: def.textBody,
      },
      updatedAt: db?.updatedAt ?? null,
    };
  }

  // ─── Admin: upsert ────────────────────────────────────────────────────────

  async upsert(name: string, dto: UpdateEmailTemplateDto, adminId: number) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === name);
    if (!def) throw new NotFoundException(`Template '${name}' không tồn tại`);

    const existing = await this.prisma.emailTemplate.findUnique({
      where: { name },
    });

    const data = {
      subject: dto.subject ?? existing?.subject ?? def.subject,
      htmlBody: dto.htmlBody ?? existing?.htmlBody ?? def.htmlBody,
      textBody: dto.textBody ?? existing?.textBody ?? def.textBody,
      description: dto.description ?? existing?.description ?? def.description,
      variables: def.variables,
      attachments: dto.attachments ?? (existing?.attachments as object[]) ?? [],
      active: dto.active ?? existing?.active ?? true,
      updatedById: adminId,
    };

    return this.prisma.emailTemplate.upsert({
      where: { name },
      create: { name, ...data },
      update: data,
    });
  }

  // ─── Admin: reset to hardcoded default ───────────────────────────────────

  async reset(name: string) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === name);
    if (!def) throw new NotFoundException(`Template '${name}' không tồn tại`);

    await this.prisma.emailTemplate.deleteMany({ where: { name } });
    return { message: `Template '${name}' đã được đặt lại về mặc định` };
  }

  // ─── Admin: seed all from defaults ───────────────────────────────────────

  async seedAll(adminId: number) {
    const results: string[] = [];
    for (const def of EMAIL_TEMPLATE_DEFAULTS) {
      const existing = await this.prisma.emailTemplate.findUnique({
        where: { name: def.name },
      });
      if (!existing) {
        await this.prisma.emailTemplate.create({
          data: {
            name: def.name,
            description: def.description,
            subject: def.subject,
            htmlBody: def.htmlBody,
            textBody: def.textBody,
            variables: def.variables,
            attachments: [],
            updatedById: adminId,
          },
        });
        results.push(def.name);
      }
    }
    return {
      seeded: results,
      skipped: EMAIL_TEMPLATE_DEFAULTS.length - results.length,
    };
  }

  // ─── Admin: preview ───────────────────────────────────────────────────────

  async preview(name: string, customVars?: Record<string, unknown>) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === name);
    if (!def) throw new NotFoundException(`Template '${name}' không tồn tại`);

    const db = await this.prisma.emailTemplate.findUnique({ where: { name } });
    const subject = db?.subject ?? def.subject;
    const htmlBody = db?.htmlBody ?? def.htmlBody;
    const textBody = db?.textBody ?? def.textBody;

    const sampleVars = TEMPLATE_SAMPLE_VARS[name] ?? {};
    const vars = { ...sampleVars, ...customVars };

    return {
      subject: subText(subject, vars),
      html: subHtml(htmlBody, vars),
      text: subText(textBody, vars),
      vars,
      hasOverride: !!db,
    };
  }

  // ─── Admin: test send ─────────────────────────────────────────────────────

  async testSend(name: string, toEmail: string) {
    const { subject, html, text } = await this.preview(name);
    await this.mailPort.send({
      to: { email: toEmail },
      subject: `[TEST] ${subject}`,
      html,
      text,
      tags: ["test", name],
    });
    return { message: `Test email đã gửi tới ${toEmail}` };
  }

  // ─── Send to specific user ───────────────────────────────────────��────────

  async sendToUser(templateName: string, dto: SendToUserDto, _adminId: number) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === templateName);
    if (!def)
      throw new NotFoundException(`Template '${templateName}' không tồn tại`);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true, name: true, emailBounced: true },
    });
    if (!user) throw new NotFoundException("User không tồn tại");
    if (user.emailBounced)
      throw new BadRequestException("Email user đã bị bounce, không thể gửi");

    const mergedVars: Record<string, unknown> = {
      ...(TEMPLATE_SAMPLE_VARS[templateName] ?? {}),
      userName: user.name || user.email.split("@")[0],
      ...dto.vars,
    };

    const { subject, html, text } = await this.preview(
      templateName,
      mergedVars,
    );
    await this.mailPort.send({
      to: { email: user.email, name: user.name ?? undefined },
      subject,
      html,
      text,
      tags: [templateName, "manual"],
    });

    return { message: `Email '${templateName}' đã gửi tới ${user.email}` };
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────

  async broadcast(
    templateName: string,
    filter: BroadcastFilterDto = {},
    adminId: number,
  ) {
    const def = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.name === templateName);
    if (!def)
      throw new NotFoundException(`Template '${templateName}' không tồn tại`);

    const users = await this.prisma.user.findMany({
      where: {
        emailBounced: false,
        ...(filter.emailVerifiedOnly ? { emailVerifiedAt: { not: null } } : {}),
        ...(filter.roles?.length
          ? { role: { in: filter.roles as Role[] } }
          : {}),
      },
      select: { id: true, email: true, name: true },
      take: filter.limit ?? 50_000,
    });

    if (!users.length) {
      return {
        broadcastId: null,
        total: 0,
        message: "Không có user nào khớp filter",
      };
    }

    const broadcast = await this.prisma.emailBroadcast.create({
      data: {
        type: "template",
        templateName,
        subject: def.subject,
        filter: filter as Prisma.InputJsonValue,
        totalCount: users.length,
        status: "running",
        startedAt: new Date(),
        createdById: adminId,
      },
    });

    const jobs = users.map(
      (u): { name: string; data: SendTemplateJobData } => ({
        name: "send-template",
        data: {
          broadcastId: broadcast.id,
          userId: u.id,
          email: u.email,
          name: u.name,
          templateName,
        },
      }),
    );
    await this.broadcastQueue.addBulk(jobs);

    return { broadcastId: broadcast.id, total: users.length };
  }

  // ─── Free composer ────────────────────────────────────────────────────────

  async compose(dto: ComposeDto, adminId: number) {
    if (!dto.to.length)
      throw new BadRequestException("Cần ít nhất 1 ��ịa chỉ email");

    const attachments = dto.attachments as unknown as
      MailAttachment[] | undefined;

    // Small lists: send inline synchronously
    if (dto.to.length <= COMPOSE_INLINE_LIMIT) {
      for (const email of dto.to) {
        await this.mailPort.send({
          to: { email },
          subject: dto.subject,
          html: dto.html,
          text: dto.text ?? "",
          attachments,
          tags: ["composed", "manual"],
        });
      }
      return {
        broadcastId: null,
        total: dto.to.length,
        message: `Đã gửi tới ${dto.to.length} địa chỉ`,
      };
    }

    // Large lists: queue
    const broadcast = await this.prisma.emailBroadcast.create({
      data: {
        type: "compose",
        subject: dto.subject,
        filter: {},
        totalCount: dto.to.length,
        status: "running",
        startedAt: new Date(),
        createdById: adminId,
      },
    });

    const jobs = dto.to.map(
      (email): { name: string; data: ComposeJobData } => ({
        name: "compose",
        data: {
          broadcastId: broadcast.id,
          email,
          subject: dto.subject,
          html: dto.html,
          text: dto.text ?? "",
          attachments,
        },
      }),
    );
    await this.broadcastQueue.addBulk(jobs);

    return {
      broadcastId: broadcast.id,
      total: dto.to.length,
      message: "Đang xử lý trong nền",
    };
  }

  // ─── Broadcast history ────────────────────────────────────────────────────

  async listBroadcasts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.emailBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.emailBroadcast.count(),
    ]);
    return { items, total, page, limit };
  }

  async getBroadcast(id: string) {
    const item = await this.prisma.emailBroadcast.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Broadcast không tồn tại");
    return item;
  }
}

// ─── Substitution helpers ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function subText(tmpl: string, vars: Record<string, unknown>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_match, rawKey: string) => {
    const value = vars[rawKey];
    if (value == null) return `{{${rawKey}}}`;
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);
  });
}

function subHtml(tmpl: string, vars: Record<string, unknown>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_match, rawKey: string) => {
    const value = vars[rawKey];
    if (value == null) return `{{${rawKey}}}`;
    const text =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
    return esc(text);
  });
}
