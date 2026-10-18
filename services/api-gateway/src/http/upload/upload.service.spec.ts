import { ConfigService } from "@nestjs/config";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { GetPresignedUrlDto } from "../dto/upload.dto";
import {
  UploadService,
  buildS3ClientConfig,
  resolvePublicBase,
} from "./upload.service";

function config(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe("buildS3ClientConfig", () => {
  it("không có key → KHÔNG truyền credentials (để SDK dùng IAM role của ECS/EC2)", () => {
    const cfg = buildS3ClientConfig(
      config({
        AWS_REGION: "ap-southeast-1",
        AWS_ACCESS_KEY_ID: "",
        AWS_SECRET_ACCESS_KEY: "",
      }),
    );
    expect(cfg.credentials).toBeUndefined();
    expect(cfg.region).toBe("ap-southeast-1");
  });

  it("có key → dùng key tĩnh", () => {
    const cfg = buildS3ClientConfig(
      config({ AWS_ACCESS_KEY_ID: "AKIA", AWS_SECRET_ACCESS_KEY: "secret" }),
    );
    expect(cfg.credentials).toEqual({
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
    });
  });

  it("có AWS_ENDPOINT_URL (LocalStack) → endpoint + path-style", () => {
    const cfg = buildS3ClientConfig(
      config({ AWS_ENDPOINT_URL: "http://localhost.localstack.cloud:4566" }),
    );
    expect(cfg.endpoint).toBe("http://localhost.localstack.cloud:4566");
    expect(cfg.forcePathStyle).toBe(true);
  });
});

describe("resolvePublicBase", () => {
  it("ưu tiên ASSET_BASE_URL (CloudFront), bỏ dấu / cuối", () => {
    expect(
      resolvePublicBase(
        config({ ASSET_BASE_URL: "https://d123.cloudfront.net/" }),
        "b",
      ),
    ).toBe("https://d123.cloudfront.net");
  });
  it("LocalStack: endpoint/bucket", () => {
    expect(
      resolvePublicBase(
        config({ AWS_ENDPOINT_URL: "http://localhost:4566" }),
        "edu",
      ),
    ).toBe("http://localhost:4566/edu");
  });
  it("mặc định: S3 virtual-hosted", () => {
    expect(resolvePublicBase(config({}), "edu")).toBe(
      "https://edu.s3.amazonaws.com",
    );
  });
});

describe("UploadService.getPresignedUploadUrl", () => {
  it("ký URL PUT và trả publicUrl theo base đã cấu hình", async () => {
    const svc = new UploadService(
      config({
        AWS_REGION: "ap-southeast-1",
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_S3_BUCKET: "edu-app-dev",
        AWS_ENDPOINT_URL: "http://localhost:4566",
      }),
    );
    const out = await svc.getPresignedUploadUrl("image/png", "vocab");
    expect(out.key).toMatch(/^vocab\/[0-9a-f-]+\.png$/);
    expect(out.url).toContain("http://localhost:4566/edu-app-dev/vocab/");
    expect(out.url).toContain("X-Amz-Signature=");
    expect(out.publicUrl).toBe(`http://localhost:4566/edu-app-dev/${out.key}`);
  });
});

describe("GetPresignedUrlDto", () => {
  const errorsFor = (body: object) =>
    validate(plainToInstance(GetPresignedUrlDto, body));

  it("cho ảnh, PDF, âm thanh", async () => {
    for (const contentType of [
      "image/png",
      "image/jpeg",
      "application/pdf",
      "audio/mpeg",
      "audio/x-m4a",
    ]) {
      expect(await errorsFor({ contentType, folder: "chat" })).toHaveLength(0);
    }
  });

  it("chặn HTML / SVG (XSS lưu trữ) và thư mục tuỳ ý", async () => {
    expect(await errorsFor({ contentType: "text/html" })).not.toHaveLength(0);
    expect(await errorsFor({ contentType: "image/svg+xml" })).not.toHaveLength(
      0,
    );
    expect(
      await errorsFor({ contentType: "image/png", folder: "../private" }),
    ).not.toHaveLength(0);
  });
});
