import { Prisma } from "@prisma/client";
import type { PrismaService } from "@app/prisma";

/** Kho JLPT chung không gắn giáo trình. */
export const JLPT_POOL = "JLPT";

const BOOK_ORDER = [
  "MINNA",
  "KLL",
  JLPT_POOL,
  "SOUMATOME",
  "SHINKANZEN",
  "TRY",
];

/** Bỏ khoảng trắng (kể cả fullwidth) và dấu chấm giữa. `\u3000` để source không chứa ký tự whitespace lạ. */
const STRIP = "[\\s・･\u3000]";

const SOURCE = {
  vocab: { table: '"Vocabulary"', column: "v.kana", lesson: '"Lesson"' },
  grammar: { table: '"Grammar"', column: "v.pattern", lesson: '"Lesson"' },
  kanji: {
    table: '"KanjiEntry"',
    column: "v.character",
    lesson: '"KanjiLesson"',
  },
} as const;

export type OverlapKind = keyof typeof SOURCE;

/** Cùng khóa với regexp_replace trong SQL: bỏ khoảng trắng và dấu chấm giữa. */
export function overlapKey(value: string): string {
  return value.toLowerCase().replace(new RegExp(STRIP, "g"), "");
}

export function bookCode(textbook: string | null | undefined): string {
  return textbook || JLPT_POOL;
}

export type BookPlacement = {
  book: string;
  lessonNumber: number;
  title: string | null;
};

function bookRank(book: string): number {
  const index = BOOK_ORDER.indexOf(book);
  return index === -1 ? 99 : index;
}

function sortPlacements(items: BookPlacement[]): BookPlacement[] {
  return [...items].sort(
    (a, b) =>
      bookRank(a.book) - bookRank(b.book) || a.lessonNumber - b.lessonNumber,
  );
}

/**
 * Sách khác đang chứa cùng một mục (cùng cách đọc / mẫu / chữ), kèm số bài để mở đúng bài.
 * Không tính bài khác của chính sách đang học.
 */
export async function alsoInTextbooks(
  prisma: PrismaService,
  kind: OverlapKind,
  keys: string[],
  currentTextbook: string | null | undefined,
): Promise<Map<string, BookPlacement[]>> {
  const mine = bookCode(currentTextbook);
  const unique = [...new Set(keys.map(overlapKey).filter(Boolean))];
  const map = new Map<string, BookPlacement[]>();
  if (unique.length === 0) return map;

  const source = SOURCE[kind];
  const rows = await prisma.$queryRaw<
    Array<{
      key: string;
      book: string;
      lessonNumber: number;
      title: string | null;
    }>
  >(
    Prisma.sql`
      SELECT lower(regexp_replace(${Prisma.raw(source.column)}, ${STRIP}, '', 'g')) AS key,
             COALESCE(l.textbook::text, ${JLPT_POOL}) AS book,
             l."lessonNumber" AS "lessonNumber",
             l.title AS title
      FROM ${Prisma.raw(source.table)} v
      JOIN ${Prisma.raw(source.lesson)} l ON l.id = v."lessonId"
      WHERE lower(regexp_replace(${Prisma.raw(source.column)}, ${STRIP}, '', 'g'))
        IN (${Prisma.join(unique)})
    `,
  );

  const seen = new Set<string>();
  for (const row of rows) {
    if (row.book === mine) continue;
    const lessonNumber = Number(row.lessonNumber);
    const mark = `${row.key}:${row.book}:${lessonNumber}`;
    if (seen.has(mark)) continue;
    seen.add(mark);
    const list = map.get(row.key) ?? [];
    list.push({ book: row.book, lessonNumber, title: row.title });
    map.set(row.key, list);
  }
  for (const [key, places] of map) map.set(key, sortPlacements(places));
  return map;
}

export async function withAlsoIn<T>(
  prisma: PrismaService,
  kind: OverlapKind,
  rows: T[],
  keyOf: (row: T) => string | null | undefined,
  currentTextbook: string | null | undefined,
): Promise<Array<T & { alsoInTextbooks: BookPlacement[] }>> {
  const books = await alsoInTextbooks(
    prisma,
    kind,
    rows.map((row) => keyOf(row) ?? ""),
    currentTextbook,
  );
  return rows.map((row) => ({
    ...row,
    alsoInTextbooks: books.get(overlapKey(keyOf(row) ?? "")) ?? [],
  }));
}
