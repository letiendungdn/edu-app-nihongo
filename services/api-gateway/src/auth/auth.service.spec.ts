import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "@app/prisma";
import { MailService } from "@app/common/mail/mail.service";
import { AuthService } from "./auth.service";

jest.mock("bcryptjs");
// jose chỉ có bản ESM — Jest (CommonJS) không parse được; test này không dùng OIDC.
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    emailVerificationToken: { create: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      emailVerificationToken: { create: jest.fn().mockResolvedValue({}) },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("mock-access-token"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test-value") },
        },
        {
          provide: MailService,
          useValue: {
            sendWelcomeSafe: jest.fn().mockResolvedValue(undefined),
            sendPasswordReset: jest.fn().mockResolvedValue(undefined),
            sendEmailVerificationSafe: jest.fn().mockResolvedValue(undefined),
            resetTokenTtlMinutes: 30,
            verifyTokenTtlMinutes: 60,
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("throws UnauthorizedException when user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: "x@x.com", password: "12345678" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: "x@x.com",
        passwordHash: "hash",
        role: Role.USER,
        name: null,
        avatarUrl: null,
        nativeLanguage: "vi",
        targetJlptLevel: null,
        studyGoalMinutes: 30,
        googleId: null,
        keycloakId: null,
        createdAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: "x@x.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("returns tokens on success", async () => {
      const user = {
        id: 1,
        email: "x@x.com",
        passwordHash: "hash",
        role: Role.USER,
        name: "Test",
        avatarUrl: null,
        nativeLanguage: "vi",
        targetJlptLevel: null,
        studyGoalMinutes: 30,
        googleId: null,
        keycloakId: null,
        createdAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: "x@x.com",
        password: "12345678",
      });

      expect(result.access_token).toBe("mock-access-token");
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe("x@x.com");
    });
  });

  describe("register", () => {
    it("throws ConflictException when email exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.register({ email: "x@x.com", password: "12345678" }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates user and returns tokens on success", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      prisma.user.create.mockResolvedValue({
        id: 2,
        email: "new@x.com",
        role: Role.USER,
        name: null,
        avatarUrl: null,
        nativeLanguage: "vi",
        targetJlptLevel: null,
        studyGoalMinutes: 30,
        googleId: null,
        keycloakId: null,
        passwordHash: "hashed",
        createdAt: new Date(),
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: "new@x.com",
        password: "12345678",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("12345678", 12);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.access_token).toBe("mock-access-token");
    });
  });
});
