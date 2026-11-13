/** Hàm thuần cho sổ từ cá nhân — tách khỏi màn hình để test bằng Vitest, không cần Expo. */

export type PersonalWordErrors = { kana?: string; meaning?: string; lesson?: string };

/** Cùng luật với DTO ở gateway và form web: app kiểm để người dùng sửa nhanh, server vẫn kiểm lại. */
export function validatePersonalWord(kana: string, meaning: string, lesson: string): PersonalWordErrors {
  const errors: PersonalWordErrors = {};
  const k = kana.trim();
  if (!k) errors.kana = 'Nhập cách đọc';
  else if (!/^[\u3040-\u30ff]+$/.test(k)) errors.kana = 'Chỉ dùng hiragana hoặc katakana';
  if (!meaning.trim()) errors.meaning = 'Nhập nghĩa';
  else if (meaning.trim().length > 100) errors.meaning = 'Nghĩa tối đa 100 ký tự';
  const n = Number(lesson);
  if (!Number.isInteger(n) || n < 1 || n > 50) errors.lesson = 'Bài từ 1 tới 50';
  return errors;
}

/**
 * Lỗi axios → câu người dùng đọc được. Gateway trả `{ success: false, error: { code, message } }`;
 * không tới được server thì axios không có `response`.
 */
export function personalWordErrorMessage(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
  if (err?.response) {
    return err.response.data?.error?.message ?? `Lỗi máy chủ (HTTP ${err.response.status})`;
  }
  return 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.';
}
