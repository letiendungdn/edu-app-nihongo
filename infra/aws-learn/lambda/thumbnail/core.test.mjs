// Chạy: cd infra/aws-learn/lambda/thumbnail && npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Jimp } from 'jimp';
import { decodeS3Key, makeThumbnail, MAX_BYTES, shouldProcess, thumbnailKey } from './core.mjs';

test('giải mã tên file trong sự kiện S3 (khoảng trắng là +, ký tự đặc biệt mã hóa %)', () => {
  assert.equal(decodeS3Key('uploads/ảnh+của+tôi%281%29.png'.replace('ảnh', '%E1%BA%A3nh')), 'uploads/ảnh của tôi(1).png');
});

test('chỉ xử lý ảnh trong uploads/, bỏ thumbnails/ để không lặp vô hạn', () => {
  assert.equal(shouldProcess('uploads/chat/a.PNG', 1000).ok, true);
  assert.equal(shouldProcess('thumbnails/chat/a.jpg', 1000).ok, false);
  assert.equal(shouldProcess('uploads/doc.pdf', 1000).ok, false);
  assert.equal(shouldProcess('uploads/big.jpg', MAX_BYTES + 1).reason, 'ảnh quá lớn');
});

test('đặt tên ảnh thu nhỏ: đổi thư mục và đuôi .jpg', () => {
  assert.equal(thumbnailKey('uploads/chat/a.png'), 'thumbnails/chat/a.jpg');
  assert.equal(thumbnailKey('uploads/x.jpeg'), 'thumbnails/x.jpg');
});

test('thu nhỏ ảnh lớn về 320 px ngang, giữ tỷ lệ; ảnh nhỏ giữ nguyên', async () => {
  const big = await new Jimp({ width: 1280, height: 960, color: 0xff0000ff }).getBuffer('image/png');
  const out = await makeThumbnail(big);
  assert.deepEqual([out.width, out.height], [320, 240]);
  assert.equal(out.body.subarray(0, 2).toString('hex'), 'ffd8'); // đầu file JPEG

  const small = await new Jimp({ width: 100, height: 50, color: 0x00ff00ff }).getBuffer('image/png');
  const kept = await makeThumbnail(small);
  assert.deepEqual([kept.width, kept.height], [100, 50]);
});
