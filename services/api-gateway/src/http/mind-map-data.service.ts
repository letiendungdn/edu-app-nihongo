import { Injectable } from "@nestjs/common";
import { JlptLevel, MindMapKind } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LEVEL_POOL_LESSON, levelPoolSql } from "@app/prisma/level-pool";

/**
 * Sơ đồ tư duy sinh từ DỮ LIỆU THẬT (toàn bộ từ vựng / ngữ pháp / kanji mỗi cấp),
 * khác với sơ đồ chủ đề dựng tay trong bảng MindMapLevel.
 * Mỗi cấp tối đa MAX_BRANCHES nhánh để vẽ được trên sơ đồ vòng tròn.
 */

export const MAX_BRANCHES = 8;
const LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

export type DataMindItem = {
  pattern: string;
  meaning: string;
  href: string;
  linkLabel: string;
  /** id bản ghi gốc (Vocabulary / Grammar / KanjiEntry) — để admin sửa / xóa */
  id?: number;
  /** id bài chứa mục (Lesson hoặc KanjiLesson) */
  lessonId?: number;
  lessonNumber?: number;
  /** Chuỗi đọc bằng loa (kana / âm on-kun) */
  speak?: string[];
  /** URL ảnh (không gửi data URL base64 — quá nặng); hasImage cho biết có ảnh hay không */
  imageUrl?: string;
  hasImage?: boolean;
};

export type DataMindBranch = {
  id: string;
  label: string;
  labelJa: string;
  hint?: string;
  patterns: DataMindItem[];
};

export type DataMindLevel = {
  kind: MindMapKind;
  level: JlptLevel;
  total: number;
  groupedBy: "partOfSpeech" | "lesson";
  branches: DataMindBranch[];
};

/** Một mục kèm bài chứa nó — đầu vào chung cho cả 3 loại. */
export type SourceItem = {
  lessonNumber: number;
  lessonTitle: string | null;
  item: DataMindItem;
  partOfSpeech?: string | null;
};

const UNIT: Record<MindMapKind, string> = {
  VOCAB: "từ",
  GRAMMAR: "mẫu",
  KANJI: "chữ",
};

// ── Nhóm theo từ loại ──────────────────────────────────────────────

export const POS_BUCKETS = [
  { id: "noun", label: "Danh từ", labelJa: "名詞" },
  { id: "suru-noun", label: "Danh từ する", labelJa: "する名詞" },
  { id: "verb", label: "Động từ", labelJa: "動詞" },
  { id: "i-adj", label: "Tính từ い", labelJa: "い形容詞" },
  { id: "na-adj", label: "Tính từ な", labelJa: "な形容詞" },
  { id: "adverb", label: "Phó từ", labelJa: "副詞" },
  { id: "other", label: "Khác", labelJa: "その他" },
] as const;

type PosBucketId = (typeof POS_BUCKETS)[number]["id"];

/** Từ loại ghi dạng "danh từ, động từ する" — lấy từ loại đứng đầu làm chuẩn. */
export function posBucket(pos: string | null | undefined): PosBucketId | null {
  if (!pos?.trim()) return null;
  const all = pos.toLowerCase();
  const first = all.split(",")[0].trim();
  // Mã do API ghi (VOCAB_PARTS_OF_SPEECH) khi admin sửa từ loại
  if (first === "noun") return "noun";
  if (first === "verb") return "verb";
  if (first === "i-adj") return "i-adj";
  if (first === "na-adj") return "na-adj";
  if (first.startsWith("danh từ") && all.includes("động từ する"))
    return "suru-noun";
  if (first.startsWith("danh từ") || first.startsWith("đại từ")) return "noun";
  if (first.includes("động từ")) return "verb";
  if (first.startsWith("tính từ i")) return "i-adj";
  if (first.startsWith("tính từ na")) return "na-adj";
  if (first.includes("phó từ")) return "adverb";
  return "other";
}

/** Chỉ nhóm theo từ loại khi gần như cả cấp đã có từ loại (N5/N4 phần lớn Minna chưa gắn). */
export function shouldGroupByPos(items: SourceItem[]): boolean {
  if (items.length === 0) return false;
  const withPos = items.filter(
    (i) => posBucket(i.partOfSpeech) !== null,
  ).length;
  return withPos / items.length >= 0.9;
}

export function groupByPos(
  kind: MindMapKind,
  items: SourceItem[],
): DataMindBranch[] {
  const buckets = new Map<PosBucketId, DataMindItem[]>();
  for (const it of items) {
    const id = posBucket(it.partOfSpeech) ?? "other";
    const list = buckets.get(id) ?? [];
    list.push(it.item);
    buckets.set(id, list);
  }
  return POS_BUCKETS.filter((b) => buckets.has(b.id)).map((b) => ({
    id: b.id,
    label: b.label,
    labelJa: `${b.labelJa} · ${buckets.get(b.id)!.length} ${UNIT[kind]}`,
    patterns: buckets.get(b.id)!,
  }));
}

// ── Nhóm theo dải bài liên tiếp ────────────────────────────────────

type LessonBlock = {
  lessonNumber: number;
  title: string | null;
  items: DataMindItem[];
};

/** Chia các bài (đã sắp xếp) thành tối đa `n` nhóm liên tiếp, cân theo số mục. */
export function partitionLessons(
  lessons: LessonBlock[],
  n: number,
): LessonBlock[][] {
  if (lessons.length === 0 || n <= 0) return [];
  if (lessons.length <= n) return lessons.map((l) => [l]);
  const total = lessons.reduce((s, l) => s + l.items.length, 0);
  const groups: LessonBlock[][] = [];
  let current: LessonBlock[] = [];
  let acc = 0;
  lessons.forEach((l, i) => {
    current.push(l);
    acc += l.items.length;
    const groupsLeft = n - groups.length - 1;
    const lessonsLeft = lessons.length - i - 1;
    const target = (total * (groups.length + 1)) / n;
    if (groupsLeft > 0 && lessonsLeft >= groupsLeft && acc >= target) {
      groups.push(current);
      current = [];
    }
  });
  if (current.length) groups.push(current);
  return groups;
}

/** "N3 · Bài 1 — Nguyên nhân, điều kiện" → "Nguyên nhân, điều kiện" */
export function shortTitle(title: string | null): string | null {
  if (!title) return null;
  const afterDash = title.split("—")[1]?.trim();
  return afterDash || title.replace(/^N\d\s*·\s*/, "").trim() || null;
}

function seriesPrefix(kind: MindMapKind, lessonNumber: number): string {
  if (kind === "KANJI" && lessonNumber <= 32) return "KLL";
  if (kind !== "KANJI" && lessonNumber <= 50) return "Minna";
  return "";
}

export function groupByLesson(
  kind: MindMapKind,
  items: SourceItem[],
): DataMindBranch[] {
  const byLesson = new Map<number, LessonBlock>();
  for (const it of items) {
    const block = byLesson.get(it.lessonNumber) ?? {
      lessonNumber: it.lessonNumber,
      title: it.lessonTitle,
      items: [],
    };
    block.items.push(it.item);
    byLesson.set(it.lessonNumber, block);
  }
  const lessons = [...byLesson.values()].sort(
    (a, b) => a.lessonNumber - b.lessonNumber,
  );

  // Không trộn giáo trình gốc (Minna / KLL) với bài bổ sung trong cùng một nhánh.
  const core = lessons.filter((l) => seriesPrefix(kind, l.lessonNumber));
  const extra = lessons.filter((l) => !seriesPrefix(kind, l.lessonNumber));
  const total = core.length + extra.length ? items.length : 0;
  const count = (ls: LessonBlock[]) =>
    ls.reduce((s, l) => s + l.items.length, 0);
  let coreSlots = core.length
    ? Math.max(1, Math.round((MAX_BRANCHES * count(core)) / total))
    : 0;
  if (extra.length && coreSlots >= MAX_BRANCHES) coreSlots = MAX_BRANCHES - 1;
  const extraSlots = extra.length ? MAX_BRANCHES - coreSlots : 0;

  const groups = [
    ...partitionLessons(core, coreSlots),
    ...partitionLessons(extra, extraSlots),
  ];
  return groups.map((g) => {
    const first = g[0];
    const last = g[g.length - 1];
    const prefix = seriesPrefix(kind, first.lessonNumber);
    const range =
      first.lessonNumber === last.lessonNumber
        ? `${first.lessonNumber}`
        : `${first.lessonNumber}–${last.lessonNumber}`;
    const single = g.length === 1 ? shortTitle(first.title) : null;
    // "Bổ sung" chỉ có nghĩa khi cấp này có giáo trình gốc (Minna / KLL) đi kèm.
    const label = prefix
      ? `${prefix} bài ${range}`
      : (single ?? (core.length ? `Bổ sung (bài ${range})` : `Bài ${range}`));
    const titles = [
      ...new Set(g.map((l) => shortTitle(l.title)).filter(Boolean)),
    ];
    const itemsInGroup = g.flatMap((l) => l.items);
    return {
      id: `lessons-${first.lessonNumber}-${last.lessonNumber}`,
      label,
      labelJa: `${itemsInGroup.length} ${UNIT[kind]}`,
      hint:
        !prefix && !single && titles.length
          ? titles.slice(0, 4).join(" · ")
          : undefined,
      patterns: itemsInGroup,
    };
  });
}

export function buildDataLevel(
  kind: MindMapKind,
  level: JlptLevel,
  items: SourceItem[],
): DataMindLevel {
  const byPos = kind === "VOCAB" && shouldGroupByPos(items);
  return {
    kind,
    level,
    total: items.length,
    groupedBy: byPos ? "partOfSpeech" : "lesson",
    branches: byPos ? groupByPos(kind, items) : groupByLesson(kind, items),
  };
}

// ── Truy vấn DB ────────────────────────────────────────────────────

/** "ひと-つ" / "ひと.つ" → "ひとつ" để máy đọc đúng âm kun. */
export function kanjiSpeakList(
  onyomi: string | null,
  kunyomi: string | null,
): string[] {
  const out: string[] = [];
  for (const field of [onyomi, kunyomi]) {
    for (const part of (field ?? "").split(/[,、;／/]+/)) {
      const text = part.replace(/[-.‐（）()]/g, "").trim();
      if (text && !out.includes(text)) out.push(text);
    }
  }
  return out;
}

type VocabRow = {
  id: number;
  kanji: string | null;
  kana: string;
  meaning: string;
  partOfSpeech: string | null;
  jlptLevel: JlptLevel;
  lessonId: number;
  lessonNumber: number;
  title: string | null;
  hasImage: boolean;
  imageUrl: string | null;
};

@Injectable()
export class MindMapDataService {
  /** Cache theo "phiên bản" dữ liệu (số dòng + updatedAt mới nhất) — admin sửa xong là thấy ngay. */
  private cache = new Map<
    MindMapKind,
    { version: string; data: DataMindLevel[] }
  >();

  constructor(private readonly prisma: PrismaService) {}

  private async version(kind: MindMapKind): Promise<string> {
    const args = { _count: { _all: true }, _max: { updatedAt: true } } as const;
    const agg =
      kind === "VOCAB"
        ? await this.prisma.vocabulary.aggregate(args)
        : kind === "GRAMMAR"
          ? await this.prisma.grammar.aggregate(args)
          : await this.prisma.kanjiEntry.aggregate(args);
    return `${agg._count._all}:${agg._max.updatedAt?.getTime() ?? 0}`;
  }

  async build(kind: MindMapKind): Promise<DataMindLevel[]> {
    const version = await this.version(kind);
    const hit = this.cache.get(kind);
    if (hit && hit.version === version) return hit.data;

    const items = await this.loadItems(kind);
    const data = LEVELS.map((level) =>
      buildDataLevel(
        kind,
        level,
        items.filter((i) => i.level === level).map((i) => i.source),
      ),
    );
    this.cache.set(kind, { version, data });
    return data;
  }

  private async loadItems(
    kind: MindMapKind,
  ): Promise<Array<{ level: JlptLevel; source: SourceItem }>> {
    if (kind === "VOCAB") {
      // SQL thô: nhiều imageUrl là data URL base64 → chỉ lấy cờ "có ảnh", không kéo cả ảnh ra.
      const rows = await this.prisma.$queryRaw<VocabRow[]>`
        SELECT v.id, v.kanji, v.kana, v.meaning, v."partOfSpeech", v."jlptLevel",
               v."lessonId", l."lessonNumber", l.title,
               (v."imageUrl" IS NOT NULL AND v."imageUrl" <> '') AS "hasImage",
               CASE WHEN v."imageUrl" LIKE 'data:%' THEN NULL ELSE v."imageUrl" END AS "imageUrl"
        FROM "Vocabulary" v
        JOIN "Lesson" l ON l.id = v."lessonId"
        WHERE v."jlptLevel" IS NOT NULL AND ${levelPoolSql("l")}
        ORDER BY l."lessonNumber", v."sortOrder", v.id`;
      return rows.map((r) => ({
        level: r.jlptLevel,
        source: {
          lessonNumber: r.lessonNumber,
          lessonTitle: r.title,
          partOfSpeech: r.partOfSpeech,
          item: {
            pattern:
              r.kanji && r.kanji !== r.kana
                ? `${r.kanji}（${r.kana}）`
                : r.kana,
            meaning: r.meaning,
            href: `/vocab?lesson=${r.lessonNumber}`,
            linkLabel: `Bài ${r.lessonNumber}`,
            id: r.id,
            lessonId: r.lessonId,
            lessonNumber: r.lessonNumber,
            speak: [r.kana],
            hasImage: r.hasImage,
            ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
          },
        },
      }));
    }

    if (kind === "GRAMMAR") {
      const rows = await this.prisma.grammar.findMany({
        where: { jlptLevel: { not: null }, lesson: LEVEL_POOL_LESSON },
        select: {
          id: true,
          lessonId: true,
          pattern: true,
          meaning: true,
          jlptLevel: true,
          lesson: { select: { lessonNumber: true, title: true } },
        },
        orderBy: [
          { lesson: { lessonNumber: "asc" } },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
      });
      return rows.map((r) => ({
        level: r.jlptLevel!,
        source: {
          lessonNumber: r.lesson.lessonNumber,
          lessonTitle: r.lesson.title,
          item: {
            pattern: r.pattern,
            meaning: r.meaning,
            href: `/grammar?lesson=${r.lesson.lessonNumber}`,
            linkLabel: `Bài ${r.lesson.lessonNumber}`,
            id: r.id,
            lessonId: r.lessonId,
            lessonNumber: r.lesson.lessonNumber,
          },
        },
      }));
    }

    const rows = await this.prisma.kanjiEntry.findMany({
      where: { jlptLevel: { not: null }, lesson: LEVEL_POOL_LESSON },
      select: {
        id: true,
        lessonId: true,
        imageUrl: true,
        character: true,
        hanViet: true,
        meaningVi: true,
        onyomi: true,
        kunyomi: true,
        jlptLevel: true,
        lesson: { select: { lessonNumber: true, title: true } },
      },
      orderBy: [
        { lesson: { lessonNumber: "asc" } },
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });
    return rows.map((r) => ({
      level: r.jlptLevel!,
      source: {
        lessonNumber: r.lesson.lessonNumber,
        lessonTitle: r.lesson.title,
        item: {
          pattern: r.hanViet ? `${r.character}  ${r.hanViet}` : r.character,
          meaning: [
            r.meaningVi,
            [r.onyomi, r.kunyomi].filter(Boolean).join(" · "),
          ]
            .filter(Boolean)
            .join(" — "),
          href: `/kanji?lesson=${r.lesson.lessonNumber}`,
          linkLabel: `Bài ${r.lesson.lessonNumber}`,
          id: r.id,
          lessonId: r.lessonId,
          lessonNumber: r.lesson.lessonNumber,
          speak: kanjiSpeakList(r.onyomi, r.kunyomi),
          hasImage: Boolean(r.imageUrl),
          ...(r.imageUrl && !r.imageUrl.startsWith("data:")
            ? { imageUrl: r.imageUrl }
            : {}),
        },
      },
    }));
  }
}
