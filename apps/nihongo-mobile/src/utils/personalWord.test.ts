import { describe, expect, it } from 'vitest';
import { personalWordErrorMessage, validatePersonalWord } from './personalWord';

describe('validatePersonalWord', () => {
  it('hợp lệ → không có lỗi', () => {
    expect(validatePersonalWord('たべます', 'ăn', '6')).toEqual({});
  });

  it('sai mọi trường', () => {
    expect(validatePersonalWord('abc', ' ', '99')).toEqual({
      kana: 'Chỉ dùng hiragana hoặc katakana',
      meaning: 'Nhập nghĩa',
      lesson: 'Bài từ 1 tới 50',
    });
  });

  it('bài không phải số nguyên', () => {
    expect(validatePersonalWord('ねこ', 'mèo', '2.5').lesson).toBe('Bài từ 1 tới 50');
  });
});

describe('personalWordErrorMessage', () => {
  it('đọc thông báo từ phong bì lỗi của gateway', () => {
    const e = { response: { status: 409, data: { success: false, error: { code: 'CONFLICT', message: 'Từ này đã có trong sổ' } } } };
    expect(personalWordErrorMessage(e)).toBe('Từ này đã có trong sổ');
  });

  it('không có response → lỗi mạng', () => {
    expect(personalWordErrorMessage(new Error('Network Error'))).toBe('Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.');
  });
});
