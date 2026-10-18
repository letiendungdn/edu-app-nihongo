import { describe, expect, it } from 'vitest';
import { ApiError } from '../../types/api';
import { errorMessage } from '../error-message';

describe('errorMessage', () => {
  it('ApiError → chỉ thông điệp, không có tiền tố "ApiError:"', () => {
    expect(errorMessage(new ApiError(400, 'Tiêu đề bắt buộc'))).toBe('Tiêu đề bắt buộc');
  });
  it('mất mạng (fetch ném TypeError) → câu dễ hiểu', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/kết nối/);
  });
  it('giá trị lạ → câu mặc định', () => {
    expect(errorMessage('x', 'Lỗi tải')).toBe('Lỗi tải');
  });
});
