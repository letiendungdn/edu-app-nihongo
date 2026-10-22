import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PORT, MAIL_TEMPLATE_STORE, type MailAttachment, type MailPort, type MailTemplateStore } from './mail.port';
import {
  renderEmailVerificationMail,
  renderPasswordChangedMail,
  renderPasswordResetMail,
  renderReengagementMail,
  renderStreakMilestoneMail,
  renderWeeklyProgressMail,
  renderWelcomeMail,
  type MailTemplateId,
  type RenderedMail,
} from './mail.templates';
import { signUnsubscribeToken } from './unsubscribe.util';

// ─── Input types ──────────────────────────────────────────────────────────────

export type SendWelcomeInput = {
  toEmail: string;
  toName?: string | null;
  attachments?: MailAttachment[];
};

export type SendEmailVerificationInput = {
  toEmail: string;
  toName?: string | null;
  verifyToken: string;
  attachments?: MailAttachment[];
};

export type SendPasswordResetInput = {
  toEmail: string;
  toName?: string | null;
  resetToken: string;
  attachments?: MailAttachment[];
};

export type SendPasswordChangedInput = {
  toEmail: string;
  toName?: string | null;
  attachments?: MailAttachment[];
};

export type SendReengagementInput = {
  userId: number;
  toEmail: string;
  toName?: string | null;
  daysInactive: number;
  dueCards: number;
};

export type SendWeeklyProgressInput = {
  userId: number;
  toEmail: string;
  toName?: string | null;
  cardsReviewed: number;
  newMastered: number;
  totalMastered: number;
  currentStreak: number;
  attachments?: MailAttachment[];
};

export type SendStreakMilestoneInput = {
  userId: number;
  toEmail: string;
  toName?: string | null;
  milestone: number;
  currentStreak: number;
  attachments?: MailAttachment[];
};

// ─── Substitution helpers ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function subText(tmpl: string, vars: Record<string, unknown>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{{${k}}}`,
  );
}

function subHtml(tmpl: string, vars: Record<string, unknown>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? esc(String(vars[k])) : `{{${k}}}`,
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string;
  private readonly appPublicUrl: string;
  private readonly resetPath: string;
  private readonly verifyPath: string;
  private readonly prefPath: string;
  private readonly resetExpiresMinutes: number;
  private readonly verifyExpiresMinutes: number;
  private readonly unsubscribeSecret: string;

  constructor(
    @Inject(MAIL_PORT) private readonly mailPort: MailPort,
    private readonly config: ConfigService,
    // Optional override from EmailTemplateModule (same instance injects MailService → forwardRef there)
    @Optional() @Inject(MAIL_TEMPLATE_STORE)
    private readonly templateStore?: MailTemplateStore,
  ) {
    this.appName = config.get<string>('mail.appName') ?? 'Nihongo EDU';
    this.appPublicUrl = (
      config.get<string>('mail.appPublicUrl') ?? 'http://nihongo.localhost:8080'
    ).replace(/\/$/, '');
    this.resetPath = config.get<string>('mail.resetPasswordPath') ?? '/reset-password';
    this.verifyPath = config.get<string>('mail.verifyEmailPath') ?? '/verify-email';
    this.prefPath = '/api/auth/email-preferences';
    this.resetExpiresMinutes = Number(config.get<number>('mail.resetExpiresMinutes') ?? 30);
    this.verifyExpiresMinutes = Number(config.get<number>('mail.verifyExpiresMinutes') ?? 1440);
    this.unsubscribeSecret =
      config.get<string>('mail.unsubscribeSecret') ??
      config.get<string>('jwt.secret') ??
      'dev-unsub-secret';
  }

  get provider(): string {
    return this.mailPort.provider;
  }

  get resetTokenTtlMinutes(): number {
    return this.resetExpiresMinutes;
  }

  get verifyTokenTtlMinutes(): number {
    return this.verifyExpiresMinutes;
  }

  buildUnsubscribeUrl(userId: number, email: string): string {
    const token = signUnsubscribeToken(userId, email, this.unsubscribeSecret);
    return `${this.appPublicUrl}${this.prefPath}?uid=${userId}&token=${encodeURIComponent(token)}`;
  }

  // ─── Template resolution ─────────────────────────────────────────────────

  private async resolveTemplate(
    name: MailTemplateId,
    hardcoded: RenderedMail,
    vars: Record<string, unknown>,
  ): Promise<{ rendered: RenderedMail; extraAttachments: MailAttachment[] }> {
    if (!this.templateStore) return { rendered: hardcoded, extraAttachments: [] };
    try {
      const tpl = await this.templateStore.findActive(name);
      if (!tpl) return { rendered: hardcoded, extraAttachments: [] };
      return {
        rendered: {
          subject: subText(tpl.subject, vars),
          html: subHtml(tpl.htmlBody, vars),
          text: subText(tpl.textBody, vars),
        },
        extraAttachments: tpl.attachments as MailAttachment[],
      };
    } catch {
      return { rendered: hardcoded, extraAttachments: [] };
    }
  }

  // ─── Welcome ─────────────────────────────────────────────────────────────

  async sendWelcomeSafe(input: SendWelcomeInput): Promise<void> {
    try {
      await this.sendWelcome(input);
    } catch (err) {
      this.logger.error({ err, to: input.toEmail }, 'Failed to send welcome email');
    }
  }

  async sendWelcome(input: SendWelcomeInput): Promise<void> {
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      loginUrl: `${this.appPublicUrl}/login`,
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'welcome',
      renderWelcomeMail(vars),
      vars,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['welcome', 'transactional'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }

  // ─── Email verification ───────────────────────────────────────────────────

  async sendEmailVerificationSafe(input: SendEmailVerificationInput): Promise<void> {
    try {
      await this.sendEmailVerification(input);
    } catch (err) {
      this.logger.error({ err, to: input.toEmail }, 'Failed to send verification email');
    }
  }

  async sendEmailVerification(input: SendEmailVerificationInput): Promise<void> {
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      verifyUrl: `${this.appPublicUrl}${this.verifyPath}?token=${encodeURIComponent(input.verifyToken)}`,
      expiresMinutes: this.verifyExpiresMinutes,
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'email_verification',
      renderEmailVerificationMail(vars),
      vars as unknown as Record<string, unknown>,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['email_verification', 'transactional'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async sendPasswordReset(input: SendPasswordResetInput): Promise<void> {
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      resetUrl: `${this.appPublicUrl}${this.resetPath}?token=${encodeURIComponent(input.resetToken)}`,
      expiresMinutes: this.resetExpiresMinutes,
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'password_reset',
      renderPasswordResetMail(vars),
      vars as unknown as Record<string, unknown>,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['password_reset', 'transactional'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }

  // ─── Password changed ─────────────────────────────────────────────────────

  async sendPasswordChangedSafe(input: SendPasswordChangedInput): Promise<void> {
    try {
      await this.sendPasswordChanged(input);
    } catch (err) {
      this.logger.error({ err, to: input.toEmail }, 'Failed to send password-changed notification');
    }
  }

  async sendPasswordChanged(input: SendPasswordChangedInput): Promise<void> {
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      supportUrl: `${this.appPublicUrl}/support`,
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'password_changed',
      renderPasswordChangedMail(vars),
      vars,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['password_changed', 'transactional'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }

  // ─── Weekly progress ──────────────────────────────────────────────────────

  async sendWeeklyProgress(input: SendWeeklyProgressInput): Promise<void> {
    const streakLabel = input.currentStreak > 0 ? `🔥 ${input.currentStreak} ngày` : '—';
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      cardsReviewed: input.cardsReviewed,
      newMastered: input.newMastered,
      totalMastered: input.totalMastered,
      currentStreak: input.currentStreak,
      streakLabel,
      appUrl: this.appPublicUrl,
      unsubscribeUrl: this.buildUnsubscribeUrl(input.userId, input.toEmail),
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'weekly_progress',
      renderWeeklyProgressMail(vars),
      vars as unknown as Record<string, unknown>,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['weekly_progress', 'product'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }

  // ─── Re-engagement (Airflow learner_insights) ─────────────────────────────

  async sendReengagement(input: SendReengagementInput): Promise<void> {
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      daysInactive: input.daysInactive,
      dueCards: input.dueCards,
      appUrl: this.appPublicUrl,
      unsubscribeUrl: this.buildUnsubscribeUrl(input.userId, input.toEmail),
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'reengagement',
      renderReengagementMail(vars),
      vars as unknown as Record<string, unknown>,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['reengagement', 'product'],
      attachments: extraAttachments,
    });
  }

  // ─── Streak milestone ─────────────────────────────────────────────────────

  async sendStreakMilestone(input: SendStreakMilestoneInput): Promise<void> {
    const MILESTONE_EMOJI: Record<number, string> = { 7: '🌱', 30: '⭐', 100: '🏆' };
    const vars = {
      appName: this.appName,
      userName: input.toName?.trim() || input.toEmail.split('@')[0] || 'bạn',
      milestone: input.milestone,
      currentStreak: input.currentStreak,
      emoji: MILESTONE_EMOJI[input.milestone] ?? '🔥',
      appUrl: this.appPublicUrl,
      unsubscribeUrl: this.buildUnsubscribeUrl(input.userId, input.toEmail),
    };
    const { rendered, extraAttachments } = await this.resolveTemplate(
      'streak_milestone',
      renderStreakMilestoneMail(vars),
      vars as unknown as Record<string, unknown>,
    );
    await this.mailPort.send({
      to: { email: input.toEmail, name: input.toName ?? undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ['streak_milestone', 'product'],
      attachments: [...(input.attachments ?? []), ...extraAttachments],
    });
  }
}
