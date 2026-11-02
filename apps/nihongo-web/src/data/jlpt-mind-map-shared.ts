/** Shared types for JLPT mind maps (grammar / vocab / kanji). */

export type JlptMindLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type JlptMindKind = 'GRAMMAR' | 'VOCAB' | 'KANJI';

export type JlptMindItem = {
  /** Chữ / từ / mẫu hiện trên dòng */
  pattern: string;
  meaning: string;
  /** Link trong app (ưu tiên hơn lessonNumber) */
  href?: string;
  lessonNumber?: number;
  linkLabel?: string;
  /** Chế độ "Toàn bộ dữ liệu": id bản ghi gốc (Vocabulary / Grammar / KanjiEntry) */
  id?: number;
  /** Lesson.id (từ vựng, ngữ pháp) hoặc KanjiLesson.id (kanji) */
  lessonId?: number;
  /** Chuỗi đọc bằng loa (kana / âm on-kun) */
  speak?: string[];
  imageUrl?: string;
  /** Có ảnh nhưng là data URL nên không gửi kèm — tải khi bấm xem */
  hasImage?: boolean;
};

export type JlptMindBranch = {
  id: string;
  label: string;
  labelJa?: string;
  hint?: string;
  /** Vị trí tùy chỉnh (% 0–100). Thiếu → bố cục vòng tròn tự động. */
  posX?: number;
  posY?: number;
  patterns: JlptMindItem[];
};

export type JlptMindMapLevel = {
  id?: number;
  kind?: JlptMindKind;
  level: JlptMindLevel;
  title: string;
  summary: string;
  accent: string;
  sortOrder?: number;
  branches: JlptMindBranch[];
};

export const JLPT_MIND_LEVELS: JlptMindLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const JLPT_MIND_KINDS: { kind: JlptMindKind; label: string; path: string }[] = [
  { kind: 'GRAMMAR', label: 'Ngữ pháp', path: '/grammar/mindmap' },
  { kind: 'VOCAB', label: 'Từ vựng', path: '/vocab/mindmap' },
  { kind: 'KANJI', label: 'Kanji', path: '/kanji/mindmap' },
];

export function resolveMindItemHref(
  item: JlptMindItem,
  lessonPath: string,
): string | null {
  if (item.href) return item.href;
  if (item.lessonNumber != null) return `${lessonPath}?lesson=${item.lessonNumber}`;
  return null;
}

export function resolveMindItemLinkLabel(item: JlptMindItem): string | null {
  if (item.linkLabel) return item.linkLabel;
  if (item.lessonNumber != null) return `Bài ${item.lessonNumber}`;
  if (item.href) return 'Mở';
  return null;
}

export function branchPosition(
  branch: JlptMindBranch,
  index: number,
  count: number,
  radius = 42,
): { x: number; y: number } {
  if (typeof branch.posX === 'number' && typeof branch.posY === 'number') {
    return {
      x: Math.min(92, Math.max(8, branch.posX)),
      y: Math.min(92, Math.max(8, branch.posY)),
    };
  }
  const angle = (-90 + (360 / Math.max(count, 1)) * index) * (Math.PI / 180);
  // Nhiều nhánh: xếp so le vòng ngoài / vòng trong để hai nhánh cạnh nhau không đè lên nhau
  const r = count > 8 ? (index % 2 === 0 ? radius + 4 : radius - 18) : radius;
  return {
    x: Math.min(90, Math.max(10, 50 + r * Math.cos(angle))),
    y: Math.min(92, Math.max(8, 50 + r * Math.sin(angle))),
  };
}
