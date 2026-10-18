/** Thông điệp lỗi để hiện cho người dùng. `String(e)` ra "ApiError: …" / "TypeError: Failed to fetch". */
export function errorMessage(e: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại'): string {
  if (e instanceof TypeError) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
