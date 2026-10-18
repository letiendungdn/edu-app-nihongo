import { ConfigService } from "@nestjs/config";
import { resolveJwtSecret } from "./jwt-secret";

function config(secret?: string) {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

describe("resolveJwtSecret", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("production: thiếu JWT_SECRET → không khởi động", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    expect(() => resolveJwtSecret(config("change-me-in-production"))).toThrow(
      /JWT_SECRET/,
    );
  });

  it("production: secret là giá trị mặc định công khai → không khởi động", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "change-me-in-production";
    expect(() => resolveJwtSecret(config("change-me-in-production"))).toThrow(
      /mặc định/,
    );
  });

  it("production: secret hợp lệ → dùng secret đó", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a-real-random-secret-with-enough-length-123";
    expect(resolveJwtSecret(config(process.env.JWT_SECRET))).toBe(
      process.env.JWT_SECRET,
    );
  });

  it("dev/test: vẫn chạy với giá trị mặc định", () => {
    process.env.NODE_ENV = "test";
    expect(resolveJwtSecret(config(undefined))).toBe("change-me-in-production");
  });
});
