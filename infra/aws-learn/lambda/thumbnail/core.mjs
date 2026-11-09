// Logic tạo ảnh thu nhỏ, tách khỏi AWS SDK để test chạy trên máy (node --test) không cần S3 hay Lambda.
import { Jimp } from 'jimp';

export const SOURCE_PREFIX = 'uploads/';
export const THUMB_PREFIX = 'thumbnails/';
export const MAX_WIDTH = 320;
/** Ảnh quá lớn thì bỏ qua: Lambda có giới hạn RAM/thời gian, ảnh 50 MB sẽ làm hàm chết giữa chừng. */
export const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|gif|bmp|tiff?)$/i;

/** Tên file trong sự kiện S3 bị mã hóa URL, khoảng trắng thành "+". Phải giải mã trước khi gọi GetObject. */
export function decodeS3Key(raw) {
  return decodeURIComponent(raw.replace(/\+/g, ' '));
}

/**
 * Có xử lý file này không. Chỉ ảnh trong uploads/: ảnh thu nhỏ ghi vào thumbnails/, nếu xử lý cả thumbnails/
 * thì mỗi ảnh thu nhỏ mới lại kích hoạt Lambda → vòng lặp vô hạn, tốn tiền.
 */
export function shouldProcess(key, size) {
  if (!key.startsWith(SOURCE_PREFIX)) return { ok: false, reason: 'ngoài thư mục uploads/' };
  if (!IMAGE_EXT.test(key)) return { ok: false, reason: 'không phải ảnh' };
  if (typeof size === 'number' && size > MAX_BYTES) return { ok: false, reason: 'ảnh quá lớn' };
  return { ok: true };
}

/** uploads/chat/a.png → thumbnails/chat/a.jpg */
export function thumbnailKey(key) {
  return THUMB_PREFIX + key.slice(SOURCE_PREFIX.length).replace(IMAGE_EXT, '') + '.jpg';
}

/** Thu nhỏ về chiều ngang tối đa MAX_WIDTH, giữ tỷ lệ, xuất JPEG. Ảnh đã nhỏ thì không phóng to. */
export async function makeThumbnail(input, maxWidth = MAX_WIDTH) {
  const image = await Jimp.read(input);
  if (image.bitmap.width > maxWidth) image.resize({ w: maxWidth });
  const body = await image.getBuffer('image/jpeg', { quality: 80 });
  return { body, width: image.bitmap.width, height: image.bitmap.height };
}
