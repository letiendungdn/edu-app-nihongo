/// Chữ đưa cho giọng đọc tiếng Anh (cùng quy tắc với web): bỏ ghi chú trong ngoặc ("(in textbook)"),
/// dấu ~ của mẫu câu, đổi ";" thành "," để ngắt nghỉ tự nhiên.
String englishForSpeech(String text) => text
    .replaceAll(RegExp(r'\([^)]*\)'), ' ')
    .replaceAll(RegExp('[~～]'), ' ')
    .replaceAll(RegExp(r'\s*;\s*'), ', ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .replaceAll(RegExp(r'\s+,'), ',')
    .trim();
