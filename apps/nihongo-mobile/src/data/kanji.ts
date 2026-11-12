/** Hàm thuần đọc dữ liệu kanji từ gateway (đã mở lớp `{ success, data }`); tách riêng để test không cần Expo. */

export interface KanjiEntry {
  id: number;
  character: string;
  hanViet: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  meaningVi: string | null;
  /** Nghĩa tiếng Anh từ KANJIDIC2 (CC BY-SA 4.0, EDRDG) — ghi nguồn ở màn kanji. */
  meaningEn: string | null;
}

export interface KanjiLessonOption {
  lessonNumber: number;
  label: string;
  count: number;
}

function listOf(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  return [];
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

export function parseKanjiEntries(raw: unknown): KanjiEntry[] {
  return listOf(raw).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Record<string, unknown>;
    if (typeof o.id !== 'number' || !text(o.character)) return [];
    return [
      {
        id: o.id,
        character: o.character as string,
        hanViet: text(o.hanViet),
        onyomi: text(o.onyomi),
        kunyomi: text(o.kunyomi),
        meaningVi: text(o.meaningVi),
        meaningEn: text(o.meaningEn),
      },
    ];
  });
}

/** Danh sách bài kanji (mọi giáo trình), bỏ bài rỗng. Nhãn: "Bài 1 · KLL". */
export function parseKanjiLessons(raw: unknown): KanjiLessonOption[] {
  return listOf(raw).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Record<string, unknown>;
    if (typeof o.lessonNumber !== 'number') return [];
    const count = (o._count as { entries?: unknown } | undefined)?.entries;
    if (typeof count !== 'number' || count <= 0) return [];
    const title = text(o.title) ?? `Bài ${o.lessonNumber}`;
    const book = text(o.textbook);
    return [{ lessonNumber: o.lessonNumber, label: book ? `${title} · ${book}` : title, count }];
  });
}
