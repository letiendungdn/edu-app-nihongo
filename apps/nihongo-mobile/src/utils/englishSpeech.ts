/**
 * Chữ đưa cho giọng đọc tiếng Anh (cùng quy tắc với web): bỏ ghi chú trong ngoặc ("(in textbook)"),
 * dấu ~ của mẫu câu, đổi ";" thành "," để ngắt nghỉ tự nhiên. Hàm thuần, tách khỏi expo-speech để test.
 */
export function englishForSpeech(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[~～]/g, ' ')
    .replace(/\s*;\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}
