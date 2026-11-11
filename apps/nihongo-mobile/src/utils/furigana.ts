/** Một đoạn furigana: [chữ, cách đọc]; cách đọc rỗng = đoạn không có kanji. */
export type FuriganaSegment = [text: string, ruby: string];

/** Đọc cột furigana do backend tính: JSON [["食","た"],["べます",""]]. Sai định dạng → []. */
export function parseFurigana(raw: string | null | undefined): FuriganaSegment[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (
      Array.isArray(v) &&
      v.every((s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'string' && typeof s[1] === 'string')
    ) {
      return v as FuriganaSegment[];
    }
  } catch {
    /* dữ liệu hỏng: hiện chữ trơn */
  }
  return [];
}

/**
 * Câu lệnh nâng cấp bảng vocabulary theo PRAGMA user_version. Trả về các lệnh cần chạy và version mới.
 * v2: nghĩa tiếng Anh, nguồn, Hán Việt, furigana (cột nullable: dữ liệu cũ và thẻ SRS giữ nguyên).
 */
export function vocabMigrations(fromVersion: number): { statements: string[]; toVersion: number } {
  const statements: string[] = [];
  if (fromVersion < 2) {
    statements.push(
      'ALTER TABLE vocabulary ADD COLUMN meaning_en TEXT',
      'ALTER TABLE vocabulary ADD COLUMN meaning_en_source TEXT',
      'ALTER TABLE vocabulary ADD COLUMN han_viet TEXT',
      'ALTER TABLE vocabulary ADD COLUMN furigana TEXT',
    );
  }
  return { statements, toVersion: Math.max(fromVersion, 2) };
}
