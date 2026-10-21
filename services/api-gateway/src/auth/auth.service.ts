import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { MailService } from "@app/common/mail/mail.service";
import { verifyUnsubscribeToken } from "@app/common";
import { PrismaService } from "@app/prisma";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { OidcAuthDto } from "./dto/oidc-auth.dto";
import {
  extractKeycloakRoles,
  mapKeycloakRolesToAppRole,
  type KeycloakIdentityPayload,
} from "./keycloak-roles";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 7;
/** Hai tab web cùng cookie refresh cùng lúc: request đến sau vẫn được cấp token trong khoảng này. */
export const REFRESH_REUSE_GRACE_MS = 30_000;

const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  avatarUrl: true,
  nativeLanguage: true,
  targetJlptLevel: true,
  studyGoalMinutes: true,
  googleId: true,
  keycloakId: true,
  passwordHash: true,
  createdAt: true,
} as const;

type PublicUserRow = {
  id: number;
  email: string;
  role: Role;
  name: string | null;
  avatarUrl: string | null;
  nativeLanguage: string | null;
  targetJlptLevel: string | null;
  studyGoalMinutes: number | null;
  googleId: string | null;
  keycloakId: string | null;
  passwordHash: string | null;
  createdAt: Date;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mail: MailService,
  ) {}

  async onModuleInit() {
    const adminEmail =
      this.configService.get<string>("ADMIN_EMAIL") ??
      process.env.ADMIN_EMAIL ??
      "admin@nihongo.local";
    const adminPassword =
      this.configService.get<string>("ADMIN_PASSWORD") ??
      process.env.ADMIN_PASSWORD ??
      "admin123";
    const existing = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await this.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hash,
          role: Role.ADMIN,
          name: "Administrator",
        },
      });
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email đã được sử dụng");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: Role.USER,
      },
      select: publicUserSelect,
    });

    const tokens = await this.generateTokens(user);
    void this.mail.sendWelcomeSafe({ toEmail: user.email, toName: user.name });
    // Không chờ, nhưng phải bắt lỗi: promise bị reject không xử lý sẽ làm Node tắt cả gateway.
    this.sendVerificationOnRegister(user.id, user.email, user.name).catch(
      (err) =>
        this.logger.error(
          `Không tạo được token xác minh email cho user ${user.id}`,
          err,
        ),
    );
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async sendVerificationOnRegister(
    userId: number,
    email: string,
    name: string | null,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(
      Date.now() + this.mail.verifyTokenTtlMinutes * 60 * 1000,
    );
    await this.prisma.emailVerificationToken.create({
      data: { tokenHash, userId, expiresAt },
    });
    void this.mail.sendEmailVerificationSafe({
      toEmail: email,
      toName: name,
      verifyToken: rawToken,
    });
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        "Link xác thực không hợp lệ hoặc đã hết hạn",
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "Email đã được xác thực thành công" };
  }

  async resendVerification(userId: number): Promise<{ message: string }> {
    const message = "Nếu email chưa được xác thực, chúng tôi đã gửi link mới.";
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (!user || user.emailVerifiedAt) return { message };

    // 5-minute cooldown
    const recent = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        usedAt: null,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) return { message };

    await this.sendVerificationOnRegister(user.id, user.email, user.name);
    return { message };
  }

  async getEmailPreferences(userId: number) {
    const prefs = await this.prisma.emailPrefs.findUnique({
      where: { userId },
    });
    return {
      receiveProgress: prefs?.receiveProgress ?? true,
      receiveStreak: prefs?.receiveStreak ?? true,
    };
  }

  async updateEmailPreferences(
    userId: number,
    receiveProgress?: boolean,
    receiveStreak?: boolean,
  ) {
    const prefs = await this.prisma.emailPrefs.upsert({
      where: { userId },
      create: {
        userId,
        receiveProgress: receiveProgress ?? true,
        receiveStreak: receiveStreak ?? true,
      },
      update: {
        ...(receiveProgress !== undefined ? { receiveProgress } : {}),
        ...(receiveStreak !== undefined ? { receiveStreak } : {}),
      },
    });
    return {
      receiveProgress: prefs.receiveProgress,
      receiveStreak: prefs.receiveStreak,
    };
  }

  async updateEmailPreferencesByToken(
    uid: number,
    token: string,
    receiveProgress?: boolean,
    receiveStreak?: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");

    const unsubscribeSecret =
      this.configService.get<string>("mail.unsubscribeSecret") ??
      this.configService.get<string>("jwt.secret") ??
      "dev-unsub-secret";

    if (!verifyUnsubscribeToken(uid, user.email, token, unsubscribeSecret)) {
      throw new ForbiddenException("Token không hợp lệ");
    }

    return this.updateEmailPreferences(uid, receiveProgress, receiveStreak);
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async loginWithOidc(dto: OidcAuthDto) {
    const keycloakUrl =
      this.configService.get<string>("keycloak.url") ??
      process.env.KEYCLOAK_URL ??
      "http://localhost:8080";
    const issuer =
      this.configService.get<string>("keycloak.issuer") ??
      process.env.KEYCLOAK_ISSUER ??
      "http://auth.localhost:8080/realms/edu-app";
    const realm =
      this.configService.get<string>("keycloak.realm") ??
      process.env.KEYCLOAK_REALM ??
      "edu-app";

    const jwksUrl = new URL(
      `/realms/${realm}/protocol/openid-connect/certs`,
      keycloakUrl.endsWith("/") ? keycloakUrl : `${keycloakUrl}/`,
    );
    const JWKS = createRemoteJWKSet(jwksUrl);

    let payload: KeycloakIdentityPayload;

    try {
      // Access token phải hợp lệ (session Keycloak còn sống)
      await jwtVerify(dto.accessToken, JWKS, { issuer });
      const identityJwt = dto.idToken?.trim() || dto.accessToken;
      const verified = await jwtVerify(identityJwt, JWKS, { issuer });
      payload = verified.payload;

      // Merge access token so realm_access + app_roles mapper are available
      try {
        const accessVerified = await jwtVerify(dto.accessToken, JWKS, {
          issuer,
        });
        const accessPayload = accessVerified.payload as KeycloakIdentityPayload;
        payload = {
          ...accessPayload,
          ...payload,
          sub: payload.sub ?? accessPayload.sub,
          realm_access: payload.realm_access ?? accessPayload.realm_access,
          app_roles: payload.app_roles ?? accessPayload.app_roles,
        };
      } catch {
        // identity token already verified above
      }
    } catch {
      throw new UnauthorizedException("Token Keycloak không hợp lệ");
    }

    if (!payload.sub) {
      throw new UnauthorizedException(
        "Token Keycloak thiếu subject — gửi kèm idToken (OIDC)",
      );
    }

    const email = (
      payload.email ??
      (payload.preferred_username?.includes("@")
        ? payload.preferred_username
        : null) ??
      `${payload.sub}@keycloak.local`
    ).toLowerCase();

    const roles = extractKeycloakRoles(payload);
    const role = mapKeycloakRolesToAppRole(roles);
    const keycloakId = payload.sub;
    const displayName = payload.name ?? payload.preferred_username ?? null;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ keycloakId }, { email }] },
      select: publicUserSelect,
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          keycloakId: user.keycloakId ?? keycloakId,
          name: user.name ?? displayName,
          // Sync role from Keycloak on every OIDC login (admin > teacher > user)
          role,
        },
        select: publicUserSelect,
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          keycloakId,
          name: displayName,
          role,
        },
        select: publicUserSelect,
      });
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const clientId =
      this.configService.get<string>("GOOGLE_CLIENT_ID") ??
      process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException(
        "Google OAuth chưa được cấu hình trên server",
      );
    }

    const client = new OAuth2Client(clientId);
    let payload: {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.credential,
        audience: clientId,
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException("Token Google không hợp lệ");
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Token Google thiếu thông tin email");
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      select: publicUserSelect,
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          name: user.name ?? payload.name ?? null,
          avatarUrl: user.avatarUrl ?? payload.picture ?? null,
        },
        select: publicUserSelect,
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          name: payload.name ?? null,
          avatarUrl: payload.picture ?? null,
          role: Role.USER,
        },
        select: publicUserSelect,
      });
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  /**
   * Đổi refresh token lấy cặp token mới (rotation).
   *
   * Bản cũ: tìm → kiểm tra → thu hồi bằng 3 bước rời: hai request cùng token đều qua bước kiểm tra
   * và đều được cấp token. Và dùng lại token đã thu hồi chỉ bị 401: kẻ cắp được token chỉ cần dùng
   * trước chủ thật là chiếm phiên, không ai biết.
   *
   * Giờ: thu hồi nguyên tử (`updateMany ... revoked = false`). Token bị thu hồi trong
   * REFRESH_REUSE_GRACE_MS (hai tab web refresh cùng lúc) vẫn được cấp token. Dùng lại token đã thu
   * hồi lâu hơn = bị đánh cắp → thu hồi MỌI phiên của user, buộc đăng nhập lại.
   */
  async refreshTokens(refreshToken: string) {
    const [tokenId, secret] = refreshToken.split(".");
    if (!tokenId || !secret) {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: {
        user: { select: publicUserSelect },
      },
    });
    if (!stored || !(await bcrypt.compare(secret, stored.token))) {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Refresh token không hợp lệ hoặc đã hết hạn",
      );
    }

    if (!stored.revoked) {
      const { count } = await this.prisma.refreshToken.updateMany({
        where: { id: stored.id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
      if (count === 1) return this.generateTokens(stored.user);
      // Thua race với request khác cùng token (vừa thu hồi xong): xử lý như token vừa bị thu hồi
    }

    const current = await this.prisma.refreshToken.findUnique({
      where: { id: stored.id },
      select: { revokedAt: true },
    });
    const revokedAt = current?.revokedAt;
    if (
      revokedAt &&
      Date.now() - revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS
    ) {
      return this.generateTokens(stored.user);
    }

    // Token đã thu hồi lâu (hoặc do đăng xuất / đổi mật khẩu) mà vẫn có người dùng → bị đánh cắp.
    // KHÔNG ghi revokedAt: revokedAt chỉ dành cho quay vòng, nếu ghi thì các token vừa bị thu hồi ở
    // đây lại lọt vào khoảng cho phép và refresh tiếp được.
    await this.prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revoked: false },
      data: { revoked: true },
    });
    this.logger.warn(
      `Refresh token đã thu hồi bị dùng lại (user ${stored.userId}): thu hồi mọi phiên`,
    );
    throw new UnauthorizedException(
      "Phiên đăng nhập không còn hợp lệ, hãy đăng nhập lại",
    );
  }

  async revokeRefreshToken(refreshToken: string) {
    const [tokenId, secret] = refreshToken.split(".");
    if (!tokenId || !secret) return;

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });
    if (!stored || stored.revoked) return;

    const valid = await bcrypt.compare(secret, stored.token);
    if (!valid) return;

    // Không ghi revokedAt (chỉ dành cho quay vòng): token đã đăng xuất mà bị dùng lại = bị đánh cắp
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });
    if (!user?.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user) return null;
    return this.toPublicUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.nativeLanguage !== undefined
          ? { nativeLanguage: dto.nativeLanguage }
          : {}),
        ...(dto.targetJlptLevel !== undefined
          ? { targetJlptLevel: dto.targetJlptLevel }
          : {}),
        ...(dto.studyGoalMinutes !== undefined
          ? { studyGoalMinutes: dto.studyGoalMinutes }
          : {}),
      },
      select: publicUserSelect,
    });
    return this.toPublicUser(user);
  }

  /**
   * Always returns the same message (anti-enumeration).
   * Only local password accounts receive a reset email.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const message =
      "Nếu email tồn tại và đăng nhập bằng mật khẩu, chúng tôi đã gửi hướng dẫn đặt lại.";
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return { message };
    }

    // 5-minute per-user cooldown — prevents quota exhaustion from distributed abuse
    const recentToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recentToken) {
      return { message };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(
      Date.now() + this.mail.resetTokenTtlMinutes * 60 * 1000,
    );

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    try {
      await this.mail.sendPasswordReset({
        toEmail: user.email,
        toName: user.name,
        resetToken: rawToken,
      });
    } catch (err: unknown) {
      this.logger.error(
        { err, userId: user.id },
        "Password reset email failed",
      );
      // Still return generic message — do not leak mail infra status to clients.
    }

    return { message };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    // Notify owner: if this wasn't them, they can contact support immediately
    void this.mail.sendPasswordChangedSafe({
      toEmail: record.user.email,
      toName: record.user.name,
    });

    return { message: "Đã đặt lại mật khẩu. Hãy đăng nhập lại." };
  }

  toPublicUser(user: PublicUserRow) {
    const { passwordHash, googleId, keycloakId, ...rest } = user;
    return {
      ...rest,
      hasPassword: !!passwordHash,
      isGoogleLinked: !!googleId,
      isKeycloakLinked: !!keycloakId,
    };
  }

  async generateTokens(user: {
    id: number;
    email: string;
    role: Role;
    name?: string | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const secret = randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(secret, 12);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    const record = await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      access_token,
      refresh_token: `${record.id}.${secret}`,
    };
  }
}
