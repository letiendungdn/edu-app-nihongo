import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Cấu hình S3 client từ env:
 * - Chỉ dùng key tĩnh khi CÓ cấu hình; không có thì để SDK tự lấy quyền (IAM role của ECS/EC2, SSO…).
 *   Truyền key rỗng làm SDK bỏ qua credential chain → ký bằng key rỗng → 403.
 * - AWS_ENDPOINT_URL (vd LocalStack http://localhost.localstack.cloud:4566) → path-style.
 */
export function buildS3ClientConfig(config: ConfigService): S3ClientConfig {
  const accessKeyId = config.get<string>("AWS_ACCESS_KEY_ID");
  const secretAccessKey = config.get<string>("AWS_SECRET_ACCESS_KEY");
  const endpoint = config.get<string>("AWS_ENDPOINT_URL");
  return {
    region: config.get<string>("AWS_REGION") ?? "ap-southeast-1",
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  };
}

/** Gốc URL công khai của file: ASSET_BASE_URL (vd CloudFront) > endpoint LocalStack > S3 mặc định. */
export function resolvePublicBase(
  config: ConfigService,
  bucket: string,
): string {
  const assetBase = config.get<string>("ASSET_BASE_URL");
  if (assetBase) return assetBase.replace(/\/+$/, "");
  const endpoint = config.get<string>("AWS_ENDPOINT_URL");
  if (endpoint) return `${endpoint.replace(/\/+$/, "")}/${bucket}`;
  return `https://${bucket}.s3.amazonaws.com`;
}

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client(buildS3ClientConfig(config));
    this.bucket = config.get("AWS_S3_BUCKET") ?? "edu-app-dev";
    this.publicBase = resolvePublicBase(config, this.bucket);
  }

  async getPresignedUploadUrl(contentType: string, folder = "uploads") {
    const ext = contentType.split("/")[1] ?? "jpg";
    const key = `${folder}/${randomUUID()}.${ext}`;
    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );
    return {
      url,
      key,
      publicUrl: `${this.publicBase}/${key}`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
