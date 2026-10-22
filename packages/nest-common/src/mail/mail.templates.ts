export type MailTemplateId =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'password_changed'
  | 'weekly_progress'
  | 'streak_milestone'
  | 'reengagement';

export type WelcomeTemplateVars = {
  appName: string;
  userName: string;
  loginUrl: string;
};

export type EmailVerificationTemplateVars = {
  appName: string;
  userName: string;
  verifyUrl: string;
  expiresMinutes: number;
};

export type PasswordResetTemplateVars = {
  appName: string;
  userName: string;
  resetUrl: string;
  expiresMinutes: number;
};

export type PasswordChangedTemplateVars = {
  appName: string;
  userName: string;
  supportUrl: string;
};

export type WeeklyProgressTemplateVars = {
  appName: string;
  userName: string;
  cardsReviewed: number;
  newMastered: number;
  totalMastered: number;
  currentStreak: number;
  appUrl: string;
  unsubscribeUrl: string;
};

export type StreakMilestoneTemplateVars = {
  appName: string;
  userName: string;
  milestone: number;
  currentStreak: number;
  appUrl: string;
  unsubscribeUrl: string;
};

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function unsubscribeFooterHtml(url: string): string {
  return `<p style="color:#999;font-size:12px;border-top:1px solid #eee;margin-top:24px;padding-top:12px">
Bạn nhận email này vì đã đăng ký <b>Nihongo EDU</b>.
<a href="${escapeHtml(url)}" style="color:#999">Quản lý email</a>
</p>`;
}

function unsubscribeFooterText(url: string): string {
  return `\n---\nQuản lý email / bỏ đăng ký: ${url}`;
}

// ─── Transactional (no unsubscribe) ──────────────────────────────────────────

export function renderWelcomeMail(vars: WelcomeTemplateVars): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const url = escapeHtml(vars.loginUrl);
  return {
    subject: `Chào mừng đến ${vars.appName}`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Tài khoản ${vars.appName} của bạn đã được tạo.`,
      `Đăng nhập: ${vars.loginUrl}`,
      '',
      'Nếu bạn không đăng ký, hãy bỏ qua email này.',
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Xin chào <strong>${name}</strong>,</p>
<p>Tài khoản <strong>${app}</strong> của bạn đã được tạo.</p>
<p><a href="${url}">Đăng nhập ngay</a></p>
<p style="color:#666;font-size:13px">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
</body></html>`,
  };
}

export function renderEmailVerificationMail(
  vars: EmailVerificationTemplateVars,
): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const url = escapeHtml(vars.verifyUrl);
  return {
    subject: `Xác thực email tài khoản ${vars.appName}`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Nhấn link để xác thực email ${vars.appName}:`,
      vars.verifyUrl,
      '',
      `Link hết hạn sau ${vars.expiresMinutes} phút.`,
      'Nếu không phải bạn, hãy bỏ qua email này.',
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Xin chào <strong>${name}</strong>,</p>
<p>Nhấn vào link để xác thực email tài khoản <strong>${app}</strong>:</p>
<p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Xác thực email</a></p>
<p style="color:#666;font-size:13px">Link hết hạn sau ${vars.expiresMinutes} phút. Nếu không phải bạn, hãy bỏ qua email này.</p>
</body></html>`,
  };
}

export function renderPasswordResetMail(
  vars: PasswordResetTemplateVars,
): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const url = escapeHtml(vars.resetUrl);
  return {
    subject: `Đặt lại mật khẩu ${vars.appName}`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Bạn (hoặc ai đó) yêu cầu đặt lại mật khẩu ${vars.appName}.`,
      `Link (hết hạn sau ${vars.expiresMinutes} phút): ${vars.resetUrl}`,
      '',
      'Nếu không phải bạn, hãy bỏ qua email này.',
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Xin chào <strong>${name}</strong>,</p>
<p>Bạn (hoặc ai đó) yêu cầu đặt lại mật khẩu <strong>${app}</strong>.</p>
<p><a href="${url}">Đặt lại mật khẩu</a></p>
<p style="color:#666;font-size:13px">Link hết hạn sau ${vars.expiresMinutes} phút. Nếu không phải bạn, hãy bỏ qua email này.</p>
</body></html>`,
  };
}

export function renderPasswordChangedMail(
  vars: PasswordChangedTemplateVars,
): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const support = escapeHtml(vars.supportUrl);
  return {
    subject: `Mật khẩu ${vars.appName} vừa được thay đổi`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Mật khẩu tài khoản ${vars.appName} của bạn vừa được thay đổi thành công.`,
      `Nếu không phải bạn, hãy liên hệ hỗ trợ ngay: ${vars.supportUrl}`,
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Xin chào <strong>${name}</strong>,</p>
<p>Mật khẩu tài khoản <strong>${app}</strong> của bạn vừa được thay đổi thành công.</p>
<p style="color:#b91c1c;font-weight:600">Nếu không phải bạn, hãy <a href="${support}">liên hệ hỗ trợ</a> ngay để bảo vệ tài khoản.</p>
</body></html>`,
  };
}

// ─── Non-transactional (has unsubscribe footer) ───────────────────────────────

export function renderWeeklyProgressMail(
  vars: WeeklyProgressTemplateVars,
): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const appUrl = escapeHtml(vars.appUrl);
  const streakLabel = vars.currentStreak > 0 ? `🔥 ${vars.currentStreak} ngày` : '—';
  return {
    subject: `📊 Tuần qua của bạn — ${vars.appName}`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Tóm tắt 7 ngày qua trên ${vars.appName}:`,
      `• Thẻ đã ôn: ${vars.cardsReviewed}`,
      `• Từ mới đã thuộc: ${vars.newMastered}`,
      `• Tổng đã thuộc: ${vars.totalMastered}`,
      `• Streak hiện tại: ${streakLabel}`,
      '',
      `Tiếp tục học tại: ${vars.appUrl}`,
      unsubscribeFooterText(vars.unsubscribeUrl),
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:520px;margin:0 auto;padding:16px">
<h2 style="font-size:20px;margin-bottom:4px">Tuần qua của bạn 📊</h2>
<p style="color:#666;margin-top:0">Xin chào <strong>${name}</strong>,</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr style="background:#fef2f2"><td style="padding:10px 14px;border-radius:6px 0 0 6px;font-weight:600">Thẻ đã ôn</td><td style="padding:10px 14px;text-align:right;font-size:22px;font-weight:700;color:#ef4444">${vars.cardsReviewed}</td></tr>
  <tr><td style="padding:10px 14px;font-weight:600">Từ mới thuộc tuần này</td><td style="padding:10px 14px;text-align:right;font-size:22px;font-weight:700;color:#16a34a">${vars.newMastered}</td></tr>
  <tr style="background:#fef2f2"><td style="padding:10px 14px;font-weight:600">Tổng từ đã thuộc</td><td style="padding:10px 14px;text-align:right;font-size:22px;font-weight:700">${vars.totalMastered}</td></tr>
  <tr><td style="padding:10px 14px;font-weight:600">Streak hiện tại</td><td style="padding:10px 14px;text-align:right;font-size:22px;font-weight:700;color:#f97316">${streakLabel}</td></tr>
</table>
<p><a href="${appUrl}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Học tiếp ngay</a></p>
${unsubscribeFooterHtml(vars.unsubscribeUrl)}
</body></html>`,
  };
}

const MILESTONE_EMOJI: Record<number, string> = { 7: '🌱', 30: '⭐', 100: '🏆' };

export function renderStreakMilestoneMail(
  vars: StreakMilestoneTemplateVars,
): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const app = escapeHtml(vars.appName);
  const appUrl = escapeHtml(vars.appUrl);
  const emoji = MILESTONE_EMOJI[vars.milestone] ?? '🔥';
  return {
    subject: `${emoji} ${vars.milestone} ngày streak liên tiếp — ${vars.appName}!`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `${emoji} Bạn vừa đạt ${vars.milestone} ngày học liên tiếp trên ${vars.appName}!`,
      `Streak hiện tại: ${vars.currentStreak} ngày.`,
      '',
      `Tiếp tục học tại: ${vars.appUrl}`,
      unsubscribeFooterText(vars.unsubscribeUrl),
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:520px;margin:0 auto;padding:16px">
<div style="text-align:center;padding:32px 0">
  <p style="font-size:56px;margin:0">${emoji}</p>
  <h2 style="font-size:24px;margin:8px 0">${vars.milestone} ngày liên tiếp!</h2>
  <p style="color:#666;margin:0">Xin chào <strong>${name}</strong>, bạn đã học <strong>${app}</strong> ${vars.currentStreak} ngày liên tiếp.</p>
</div>
<p style="text-align:center"><a href="${appUrl}" style="display:inline-block;padding:10px 24px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Duy trì streak ngay</a></p>
${unsubscribeFooterHtml(vars.unsubscribeUrl)}
</body></html>`,
  };
}

export type ReengagementTemplateVars = {
  appName: string;
  userName: string;
  daysInactive: number;
  dueCards: number;
  appUrl: string;
  unsubscribeUrl: string;
};

/** Học viên đang học đều rồi nghỉ vài ngày (pipeline Airflow learner_insights phát hiện). */
export function renderReengagementMail(vars: ReengagementTemplateVars): RenderedMail {
  const name = escapeHtml(vars.userName || 'bạn');
  const appUrl = escapeHtml(vars.appUrl);
  const dueLine =
    vars.dueCards > 0
      ? `Có ${vars.dueCards} thẻ đang chờ bạn ôn, ôn sớm thì nhớ lâu hơn.`
      : 'Chỉ cần 5 phút hôm nay để giữ nhịp học.';
  return {
    subject: `Đã ${vars.daysInactive} ngày rồi, quay lại ôn một chút nhé? — ${vars.appName}`,
    text: [
      `Xin chào ${vars.userName || 'bạn'},`,
      '',
      `Bạn đã nghỉ ${vars.daysInactive} ngày. ${dueLine}`,
      '',
      `Học tiếp tại: ${vars.appUrl}/srs`,
      unsubscribeFooterText(vars.unsubscribeUrl),
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:520px;margin:0 auto;padding:16px">
<h2 style="font-size:20px;margin-bottom:4px">Lâu rồi không gặp 👋</h2>
<p style="color:#666;margin-top:0">Xin chào <strong>${name}</strong>,</p>
<p>Bạn đã nghỉ <strong>${vars.daysInactive} ngày</strong>. ${escapeHtml(dueLine)}</p>
<p><a href="${appUrl}/srs" style="display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Ôn tiếp 5 phút</a></p>
${unsubscribeFooterHtml(vars.unsubscribeUrl)}
</body></html>`,
  };
}

