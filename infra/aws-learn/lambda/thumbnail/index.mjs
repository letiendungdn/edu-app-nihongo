// Lambda: S3 có ảnh mới trong uploads/ → tạo ảnh thu nhỏ vào thumbnails/.
// AWS SDK v3 có sẵn trong runtime nodejs22.x của Lambda, không cần đóng gói. Trên LocalStack, LocalStack tự đặt
// biến AWS_ENDPOINT_URL cho Lambda nên cùng code này gọi được S3 giả lập.
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { decodeS3Key, makeThumbnail, shouldProcess, thumbnailKey } from './core.mjs';

const s3 = new S3Client({ forcePathStyle: Boolean(process.env.AWS_ENDPOINT_URL) });

export async function handler(event) {
  const results = [];
  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    const key = decodeS3Key(record.s3.object.key);
    const check = shouldProcess(key, record.s3.object.size);
    if (!check.ok) {
      results.push({ key, skipped: check.reason });
      continue;
    }
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const input = Buffer.from(await object.Body.transformToByteArray());
    const thumb = await makeThumbnail(input);
    const target = thumbnailKey(key);
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: target, Body: thumb.body, ContentType: 'image/jpeg' }),
    );
    results.push({ key, thumbnail: target, width: thumb.width, height: thumb.height });
  }
  // Một dòng log có cấu trúc mỗi lần chạy: xem trong CloudWatch Logs.
  console.log(JSON.stringify({ event: 'thumbnail', results }));
  return { results };
}
