export { default as configuration } from './config/configuration';
export { pinoConfig } from './logger/pino.config';
export { CacheKeys, CacheTTL } from './cache/cache-keys';
export { AllExceptionsFilter } from './filters/all-exceptions.filter';
export { ResponseInterceptor } from './interceptors/response.interceptor';
export { RawResponse } from './interceptors/raw-response.decorator';
export { shuffle, sample } from './utils/array';
export { speechTextFromJapanese } from './utils/japanese';
export { normalizeAnswer, parseJsonArray } from './utils/string';
export { RomajiTrie, normalizeRomaji, romajiKeys, looksLikeRomaji } from './utils/romaji-trie';
export { resolveMicroserviceError } from './utils/rpc-error';
export {
  handleGrpcDispatch,
  type PatternHandler,
  type GrpcDispatchRequest,
  type GrpcDispatchResponse,
} from './grpc/dispatch.util';
export { GrpcDispatchClient } from './grpc/grpc-dispatch.client';
export { Public } from './auth/public.decorator';
export { Roles } from './auth/roles.decorator';
export { JwtAuthGuard } from './auth/jwt-auth.guard';
export { OptionalJwtAuthGuard } from './auth/optional-jwt-auth.guard';
export { RolesGuard } from './auth/roles.guard';
export { CurrentUser } from './auth/current-user.decorator';
export type { AuthUserPayload } from './auth/current-user.decorator';
export { AuditModule } from './audit/audit.module';
export { AuditService } from './audit/audit.service';
export { AuditInterceptor } from './audit/audit.interceptor';
export { AuditLog, AuditLogSchema } from './audit/audit-log.schema';
export type { AuditLogDocument } from './audit/audit-log.schema';
export { RedisModule, REDIS_CLIENT } from './redis/redis.module';
export { RateLimit } from './rate-limit/rate-limit.decorator';
export { SlidingWindowRateLimitGuard } from './rate-limit/sliding-window.guard';
export { MailModule } from './mail/mail.module';
export { MailService } from './mail/mail.service';
export { MAIL_PORT, MAIL_TEMPLATE_STORE } from './mail/mail.port';
export type { MailPort, MailMessage, MailAddress, MailAttachment, MailTemplateStore } from './mail/mail.port';
export {
  renderWelcomeMail,
  renderEmailVerificationMail,
  renderPasswordResetMail,
  renderPasswordChangedMail,
  renderWeeklyProgressMail,
  renderStreakMilestoneMail,
} from './mail/mail.templates';
export type {
  MailTemplateId,
  RenderedMail,
  WelcomeTemplateVars,
  EmailVerificationTemplateVars,
  PasswordResetTemplateVars,
  PasswordChangedTemplateVars,
  WeeklyProgressTemplateVars,
  StreakMilestoneTemplateVars,
} from './mail/mail.templates';
export {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from './mail/unsubscribe.util';
export type {
  SendEmailVerificationInput,
  SendWeeklyProgressInput,
  SendStreakMilestoneInput,
} from './mail/mail.service';
