import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import {
  grammarMatchers,
  sameGrammarFunction,
  predictJlpt,
  type JlptLevelKey,
  type PracticeEvidence,
} from "./jlpt-prediction";

const LEVELS: JlptLevelKey[] = ["n5", "n4", "n3", "n2", "n1"];

export interface LikelyItem {
  text: string;
  reading: string | null;
  meaning: string;
  lessonNumber: number | null;
  score: number;
  tier: "Rất hay ra" | "Hay ra" | "Có thể ra";
  reasons: string[];
  /** Cách viết khác của cùng mẫu ngữ pháp (đã gộp) */
  alt?: string[];
}

type VocabRow = {
  word: string;
  reading: string;
  meaning: string;
  lesson: number | null;
  freq: number | null;
  sources: number;
};
type KanjiRow = {
  character: string;
  hv: string | null;
  meaning: string;
  lesson: number | null;
  freq: number | null;
  usage: number;
};
type GrammarRow = {
  pattern: string;
  meaning: string;
  lesson: number | null;
  sources: number;
  core: boolean;
};

const tierOf = (score: number): LikelyItem["tier"] =>
  score >= 0.7 ? "Rất hay ra" : score >= 0.45 ? "Hay ra" : "Có thể ra";
const fmt = (n: number) => n.toLocaleString("vi-VN");

/**
 * "Dự đoán đề thi":
 *  - score(): điểm & xác suất đỗ ước lượng từ các bài thi thử của người dùng.
 *  - likely(): xếp hạng từ / kanji / mẫu ngữ pháp dễ ra theo tần suất báo chí (JMdict,
 *    KANJIDIC2 — scripts/import-frequency.mjs) và độ phủ trong các giáo trình luyện thi.
 *    JLPT không công bố đề cũ đầy đủ nên đây là ước lượng, không phải "đề lộ".
 */
@Injectable()
export class JlptPredictionService {
  constructor(private readonly prisma: PrismaService) {}

  private corpus: { sentences: string[]; loadedAt: number } | null = null;

  /**
   * Kho câu tiếng Nhật trong app (câu ví dụ từ vựng, bài đọc, đề thi thử) — dùng đếm mức độ
   * phổ biến của mẫu ngữ pháp. Không gồm câu ví dụ của chính các mẫu ngữ pháp.
   */
  private async loadCorpus(): Promise<string[]> {
    if (this.corpus && Date.now() - this.corpus.loadedAt < 30 * 60 * 1000) return this.corpus.sentences;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ text: string }>>(
      `SELECT ja AS text FROM "VocabularyExample"
       UNION ALL SELECT content FROM "ReadingPassage"
       UNION ALL SELECT question FROM "MockExamQuestion"
       UNION ALL SELECT "audioText" FROM "MockExamQuestion" WHERE "audioText" IS NOT NULL`,
    );
    const sentences = rows.map((r) => r.text).filter(Boolean);
    this.corpus = { sentences, loadedAt: Date.now() };
    return sentences;
  }

  private levelKey(level: string | undefined): JlptLevelKey {
    const key = (level ?? "").toLowerCase() as JlptLevelKey;
    if (!LEVELS.includes(key)) {
      throw new BadRequestException("level phải là một trong n5, n4, n3, n2, n1");
    }
    return key;
  }

  async score(userId: number, level: string | undefined) {
    const key = this.levelKey(level);
    const results = await this.prisma.examResult.findMany({
      where: { userId, level: key },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        submittedAt: true,
        sections: { select: { section: true, correct: true, total: true } },
      },
    });
    const practice = await this.practiceEvidence(userId, key.toUpperCase());
    return predictJlpt(key, results, practice);
  }

  /** Kết quả luyện tập cùng cấp: ôn SRS (ngôn ngữ), bài đọc hiểu, nghe chép từ (nghe). */
  private async practiceEvidence(userId: number, jlpt: string): Promise<PracticeEvidence[]> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ section: string; source: string; correct: number; total: number }>
    >(
      `SELECT CASE c."contentType" WHEN 'VOCABULARY' THEN 'vocab' WHEN 'GRAMMAR' THEN 'grammar' ELSE 'kanji' END AS section,
              'Ôn SRS' AS source,
              sum(c."correctCount")::int AS correct, sum(c."correctCount" + c."wrongCount")::int AS total
       FROM "SrsCard" c
       LEFT JOIN "Vocabulary" v ON c."contentType" = 'VOCABULARY' AND v.id = c."contentId"
       LEFT JOIN "Grammar" g ON c."contentType" = 'GRAMMAR' AND g.id = c."contentId"
       LEFT JOIN "KanjiEntry" k ON c."contentType" = 'KANJI' AND k.id = c."contentId"
       WHERE c."userId" = $1 AND coalesce(v."jlptLevel", g."jlptLevel", k."jlptLevel")::text = $2
       GROUP BY 1
       UNION ALL
       SELECT 'reading', 'Bài đọc hiểu', sum(a.correct)::int, sum(a.total)::int
       FROM "ReadingAttempt" a JOIN "ReadingPassage" p ON p.id = a."passageId"
       WHERE a."userId" = $1 AND p."jlptLevel"::text = $2
       UNION ALL
       SELECT 'listening', 'Nghe chép từ', (count(*) FILTER (WHERE d.correct))::int, count(*)::int
       FROM "DictationAttempt" d JOIN "Vocabulary" v ON v.id = d."vocabId"
       WHERE d."userId" = $1 AND v."jlptLevel"::text = $2`,
      userId,
      jlpt,
    );
    return rows.filter((r) => r.total > 0);
  }

  async likely(level: string | undefined, limit = 40) {
    const key = this.levelKey(level);
    const jlpt = key.toUpperCase();
    const take = Math.min(Math.max(Math.trunc(limit) || 40, 5), 100);

    const [vocabRows, kanjiRows, grammarRows, corpus] = await Promise.all([
      this.prisma.$queryRawUnsafe<VocabRow[]>(
        `WITH rows AS (
           SELECT regexp_replace(coalesce(nullif(btrim(v.kanji), ''), v.kana), '[[:space:]～〜~（）()]', '', 'g') AS word,
                  regexp_replace(v.kana, '[[:space:]～〜~（）()]', '', 'g') AS reading,
                  v.meaning, v."frequencyRank" AS freq, l."lessonNumber" AS lesson,
                  l."jlptLevel"::text AS lesson_level, coalesce(l.textbook::text, 'JLPT') AS src
           FROM "Vocabulary" v JOIN "Lesson" l ON l.id = v."lessonId")
         SELECT r.word, min(r.reading) AS reading, min(r.meaning) AS meaning,
                coalesce(min(r.lesson) FILTER (WHERE r.lesson_level = $1), min(r.lesson)) AS lesson,
                min(r.freq) AS freq, count(DISTINCT r.src)::int AS sources
         FROM rows r JOIN "VocabularyUnique" u ON u.word = r.word AND u.reading = r.reading
         WHERE u."jlptLevel"::text = $1
         GROUP BY r.word`,
        jlpt,
      ),
      this.prisma.$queryRawUnsafe<KanjiRow[]>(
        `SELECT k.character, min(k."hanViet") AS hv, min(k."meaningVi") AS meaning,
                min(l."lessonNumber") AS lesson, min(k.frequency) AS freq,
                (SELECT count(*)::int FROM "VocabularyUnique" u
                  WHERE u.word LIKE '%' || k.character || '%' AND u."jlptLevel" <= $1::"JlptLevel") AS usage
         FROM "KanjiEntry" k JOIN "KanjiUnique" ku ON ku.character = k.character
         LEFT JOIN "KanjiLesson" l ON l.id = k."lessonId"
         WHERE ku."jlptLevel"::text = $1
         GROUP BY k.character`,
        jlpt,
      ),
      this.prisma.$queryRawUnsafe<GrammarRow[]>(
        `WITH rows AS (
           SELECT regexp_replace(regexp_replace(g.pattern, '[（(][ぁ-んァ-ンー・、 ]+[）)]', '', 'g'), '[[:space:]～〜~＋+・/／]', '', 'g') AS key,
                  g.pattern, g.meaning, l."lessonNumber" AS lesson, l."jlptLevel"::text AS lesson_level, l.textbook
           FROM "Grammar" g JOIN "Lesson" l ON l.id = g."lessonId")
         SELECT min(r.pattern) AS pattern, min(r.meaning) AS meaning,
                coalesce(min(r.lesson) FILTER (WHERE r.lesson_level = $1), min(r.lesson)) AS lesson,
                count(DISTINCT coalesce(r.textbook::text, 'JLPT'))::int AS sources,
                bool_or(r.textbook IS NULL) AS core
         FROM rows r JOIN "GrammarUnique" gu ON gu.pattern = r.key
         WHERE gu."jlptLevel"::text = $1
         GROUP BY r.key`,
        jlpt,
      ),
      this.loadCorpus(),
    ]);

    const vocab = vocabRows
      .map((r): LikelyItem => {
        const freqScore = r.freq == null ? 0.1 : Math.max(0, 1 - r.freq / 24000);
        const score = 0.75 * freqScore + 0.25 * Math.min(1, (r.sources - 1) / 3);
        const reasons: string[] = [];
        if (r.freq != null && r.freq <= 10000) reasons.push(`Top ${fmt(Math.ceil(r.freq / 1000) * 1000)} từ hay gặp trên báo`);
        else if (r.freq != null) reasons.push("Từ thông dụng (JMdict)");
        if (r.sources >= 2) reasons.push(`Có trong ${r.sources} giáo trình`);
        return { text: r.word, reading: r.reading === r.word ? null : r.reading, meaning: r.meaning, lessonNumber: r.lesson, score: round(score), tier: tierOf(score), reasons };
      })
      .sort(byScore)
      .slice(0, take);

    const kanji = kanjiRows
      .map((r): LikelyItem => {
        const freqScore = r.freq == null ? 0.1 : Math.max(0, 1 - r.freq / 2500);
        const score = 0.6 * freqScore + 0.4 * Math.min(1, r.usage / 15);
        const reasons: string[] = [];
        if (r.freq != null) reasons.push(`Hạng ${fmt(r.freq)}/2.500 kanji trên báo`);
        if (r.usage) reasons.push(`Có trong ${r.usage} từ vựng đến ${jlpt}`);
        return { text: r.character, reading: r.hv ? r.hv.toUpperCase() : null, meaning: r.meaning, lessonNumber: r.lesson, score: round(score), tier: tierOf(score), reasons };
      })
      .sort(byScore)
      .slice(0, take);

    const matchers = new Map(grammarRows.map((r) => [r.pattern, grammarMatchers(r.pattern)] as const));
    const usage = new Map(
      grammarRows.map((r) => {
        const m = matchers.get(r.pattern)!;
        // Trợ từ một chữ (で, の, と…) khớp mọi cách dùng — đếm không phân biệt được, coi như không đo
        const hits = isDistinctive(m) ? corpus.filter((t) => m.some((re) => re.test(t))).length : null;
        return [r.pattern, hits] as const;
      }),
    );
    const maxHits = Math.max(1, ...[...usage.values()].map((n) => n ?? 0));
    const scoredGrammar = grammarRows
      .map((r): LikelyItem => {
        const hits = usage.get(r.pattern) ?? null;
        // Mẫu không đo được trong kho câu (chỉ có chỗ trống V/N…) tính ở mức trung bình
        // 0 câu: kho câu của app thiếu ví dụ (vd tôn kính られる), chưa chắc là mẫu hiếm — điểm thấp-vừa
        const usageScore = hits == null ? 0.5 : hits === 0 ? 0.3 : Math.log1p(hits) / Math.log1p(maxHits);
        const coverage = Math.min(1, r.sources / 4 + (r.core ? 0.15 : 0));
        const score = 0.4 * coverage + 0.6 * usageScore;
        const reasons: string[] = [];
        if (hits) reasons.push(`Gặp trong ${fmt(hits)} câu ví dụ, bài đọc, đề thi`);
        else if (hits === 0) reasons.push("Chưa gặp trong kho câu của app");
        if (r.sources >= 2) reasons.push(`Có trong ${r.sources} giáo trình luyện thi`);
        if (r.core) reasons.push(`Có trong bộ ngữ pháp ${jlpt} của app`);
        return { text: r.pattern, reading: null, meaning: r.meaning, lessonNumber: r.lesson, score: round(score), tier: tierOf(score), reasons };
      })
      .sort(byScore);
    const grammar = mergeSameGrammar(scoredGrammar, matchers).slice(0, take);

    return {
      level: key,
      vocab,
      kanji,
      grammar,
      method: [
        "Từ vựng: 75% theo tần suất trên báo chí (JMdict nf01–nf48 — nhóm 500 từ của báo Mainichi), 25% theo số giáo trình có từ đó.",
        "Kanji: 60% theo hạng tần suất trên báo (KANJIDIC2), 40% theo số từ vựng cùng cấp dùng chữ đó.",
        `Ngữ pháp: 60% theo số câu trong kho ${fmt(corpus.length)} câu tiếng Nhật của app (câu ví dụ từ vựng, bài đọc, đề thi thử) có dùng mẫu đó, 40% theo số giáo trình luyện thi có mẫu đó.`,
        "JLPT không công bố toàn bộ đề cũ, nên đây là ước lượng mức độ quan trọng — không phải đề thi thật.",
      ],
      attribution: "Tần suất từ JMdict và KANJIDIC2 © EDRDG, giấy phép CC BY-SA 4.0.",
    };
  }
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Gộp các cách ghi khác nhau của cùng một mẫu (「〜結果」 và 「V(た) + 結果」) — cùng bộ biểu
 * thức tìm trong câu nghĩa là cùng một điểm ngữ pháp. Giữ mục điểm cao nhất (danh sách đã sắp).
 */
function mergeSameGrammar(items: LikelyItem[], matchers: Map<string, RegExp[]>): LikelyItem[] {
  const out: Array<{ item: LikelyItem; sources: Set<string> | null }> = [];
  for (const item of items) {
    const m = matchers.get(item.text) ?? [];
    // Chỉ gộp khi biểu thức đủ đặc trưng: 「N1 と N2」 và 「N（người）と V」 cùng tìm 「と」
    // nhưng là hai điểm ngữ pháp khác nhau
    const sources = isDistinctive(m) ? new Set(m.map((r) => r.source)) : null;
    // Cùng mẫu khi tập biểu thức của mục này nằm trọn trong mục kia hoặc ngược lại
    // (「〜結果」 ⊂ 「V(た) + 結果 / N + の結果」)
    const kept = sources
      ? out.find(
          (o) =>
            o.sources &&
            (isSubset(sources, o.sources) || isSubset(o.sources, sources)) &&
            sameGrammarFunction(o.item.text, item.text),
        )?.item
      : undefined;
    if (!kept) {
      out.push({ item, sources });
      continue;
    }
    kept.alt = [...(kept.alt ?? []), item.text];
    for (const reason of item.reasons) {
      // Giữ số câu của mục chính và một dòng "Có trong N giáo trình" — không lặp lại
      if (reason.startsWith("Gặp trong")) continue;
      if (/giáo trình luyện thi$/.test(reason) && kept.reasons.some((r) => /giáo trình luyện thi$/.test(r))) continue;
      if (!kept.reasons.includes(reason)) kept.reasons.push(reason);
    }
  }
  return out.map((o) => o.item);
}

/** Biểu thức đủ đặc trưng để đếm và gộp (không phải một trợ từ đơn lẻ). */
function isDistinctive(matchers: RegExp[]) {
  return matchers.length > 0 && matchers.some((r) => r.source.length >= 2);
}

function isSubset(a: Set<string>, b: Set<string>) {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function byScore(a: LikelyItem, b: LikelyItem) {
  return b.score - a.score || a.text.localeCompare(b.text);
}
