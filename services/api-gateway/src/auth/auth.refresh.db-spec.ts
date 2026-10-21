import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { ConfigService } from "@nestjs/config";
import { PrismaService } from "@app/prisma";
import type { MailService } from "@app/common/mail/mail.service";
import { AuthService, REFRESH_REUSE_GRACE_MS } from "./auth.service";
import { createUser, resetTables } from "../../../test/db-fixtures";

// jose là ESM thuần, jest (CommonJS) không load được; luồng refresh không dùng tới (chỉ OIDC dùng)
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe("Refresh token rotation (Postgres thật)", () => {
  const prisma = new PrismaService();
  const auth = new AuthService(
    prisma,
    new JwtService({ secret: "test-secret" }),
    { get: () => undefined } as unknown as ConfigService,
    {} as MailService,
  );

  beforeEach(() => resetTables(prisma));
  afterAll(() => prisma.$disconnect());

  async function login() {
    const user = await createUser(prisma);
    const tokens = await auth.generateTokens({
      id: user.id,
      email: user.email,
      role: "USER",
    });
    return { user, refresh: tokens.refresh_token };
  }

  const activeCount = (userId: number) =>
    prisma.refreshToken.count({ where: { userId, revoked: false } });

  it("refresh bình thường → token cũ bị thu hồi, token mới dùng được", async () => {
    const { user, refresh } = await login();

    const next = await auth.refreshTokens(refresh);

    expect(next.refresh_token).not.toBe(refresh);
    expect(await activeCount(user.id)).toBe(1);
    await expect(auth.refreshTokens(next.refresh_token)).resolves.toBeDefined();
  });

  it("hai tab refresh CÙNG LÚC bằng một token → cả hai đều được cấp token (không đăng xuất)", async () => {
    const { refresh } = await login();

    const results = await Promise.allSettled([
      auth.refreshTokens(refresh),
      auth.refreshTokens(refresh),
    ]);

    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
  });

  it("token đã thu hồi quá lâu bị dùng lại (bị đánh cắp) → 401 và thu hồi MỌI phiên của user", async () => {
    const { user, refresh } = await login();
    const next = await auth.refreshTokens(refresh); // chủ thật đã quay vòng
    const otherDevice = await auth.generateTokens({
      id: user.id,
      email: user.email,
      role: "USER",
    });
    // Đẩy thời điểm thu hồi về quá khoảng cho phép
    await prisma.refreshToken.update({
      where: { id: refresh.split(".")[0] },
      data: { revokedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1000) },
    });

    await expect(auth.refreshTokens(refresh)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(await activeCount(user.id)).toBe(0);
    await expect(auth.refreshTokens(next.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(auth.refreshTokens(otherDevice.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("token sau khi đăng xuất bị dùng lại → 401", async () => {
    const { refresh } = await login();
    await auth.revokeRefreshToken(refresh);
    await prisma.refreshToken.updateMany({
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    await expect(auth.refreshTokens(refresh)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("secret sai → 401, không đụng tới phiên của user", async () => {
    const { user, refresh } = await login();
    const [id] = refresh.split(".");

    await expect(auth.refreshTokens(`${id}.sai`)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(await activeCount(user.id)).toBe(1);
  });
});
