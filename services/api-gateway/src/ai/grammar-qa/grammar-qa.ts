import { createHash } from "node:crypto";

/**
 * Hỏi đáp ngữ pháp có trích nguồn (RAG): phần hàm thuần, test không cần DB hay AI.
 *
 * Luồng: câu hỏi → embedding → so với embedding của ~1.700 mẫu ngữ pháp → lấy top K → AI chỉ được trả lời
 * dựa trên K nguồn đó, đánh số [1]..[K] → server kiểm tra trích dẫn. Xem docs/core-flows.md mục 9b.
 */

export interface GrammarDoc {
  grammarId: number;
  pattern: string;
  meaning: string;
  explanation: string | null;
  jlptLevel: string | null;
  lessonId: number;
  examples: { jp: string; vi: string | null }[];
}

export interface IndexedDoc {
  grammarId: number;
  pattern: string;
  meaning: string;
  jlptLevel: string | null;
  lessonId: number;
  /** Số bài, để web mở /grammar?lesson=…; null khi bài không đánh số. */
  lessonNumber: number | null;
  /** Nội dung đã embed, cũng là nội dung đưa cho AI làm nguồn. */
  text: string;
  /** Vector đã chuẩn hóa độ dài 1: cosine = tích vô hướng. */
  vector: Float32Array;
}

export interface RankedSource {
  grammarId: number;
  pattern: string;
  meaning: string;
  jlptLevel: string | null;
  lessonId: number;
  lessonNumber: number | null;
  score: number;
  text: string;
}

/** Số ví dụ đưa vào nội dung để embed: đủ ngữ cảnh mà không làm loãng nghĩa của mẫu. */
const EXAMPLES_PER_DOC = 3;
const MAX_DOC_CHARS = 1200;

/** Nội dung đem đi embed và đưa cho AI làm nguồn. */
export function docText(doc: GrammarDoc): string {
  const lines = [
    `Mẫu: ${doc.pattern}`,
    doc.jlptLevel ? `Cấp: ${doc.jlptLevel}` : "",
    `Nghĩa: ${doc.meaning}`,
    doc.explanation ? `Giải thích: ${doc.explanation}` : "",
    ...doc.examples
      .slice(0, EXAMPLES_PER_DOC)
      .map((e) => `Ví dụ: ${e.jp}${e.vi ? ` — ${e.vi}` : ""}`),
  ].filter(Boolean);
  return lines.join("\n").slice(0, MAX_DOC_CHARS);
}

/** Đổi model hoặc đổi nội dung thì hash đổi → reindex chỉ làm lại những dòng đó. */
export function contentHash(text: string, model: string): string {
  return createHash("sha256").update(`${model}\0${text}`).digest("hex");
}

export function normalize(values: ArrayLike<number>): Float32Array {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] * values[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i] / norm;
  return out;
}

export function dot(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** float32 little-endian ↔ bytes, để lưu cột BYTEA. */
export function vectorToBytes(v: Float32Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(v.length * 4));
  const view = new DataView(out.buffer);
  v.forEach((x, i) => view.setFloat32(i * 4, x, true));
  return out;
}

export function bytesToVector(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

/** Cụm chữ Nhật (kana/kanji) dài ≥ 2 trong câu hỏi, ví dụ 「ことがある」, 「ばかり」. */
export function japaneseRuns(text: string): string[] {
  return text.match(/[\u3040-\u30ff\u3400-\u9fff]{2,}/g) ?? [];
}

/** Độ dài chuỗi con chung dài nhất của hai chuỗi ngắn. */
function longestCommon(a: string, b: string): number {
  let best = 0;
  const prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = up;
    }
  }
  return best;
}

/**
 * Điểm theo chữ: câu hỏi có cụm chữ Nhật trùng với mẫu thì được 1. Embedding đôi khi xếp sai thứ tự giữa
 * các mẫu gần nghĩa; người học gõ hẳn 「たことがある」 thì mẫu đó phải lên đầu.
 *
 * So bằng chuỗi con chung (≥ 3 ký tự, hoặc trùng trọn cụm 2 ký tự) chứ không so nguyên chuỗi: người học
 * gõ thể thường 「たことがある」 còn DB lưu thể lịch sự 「たことがあります」.
 */
export function lexicalScore(question: string, pattern: string): number {
  const runs = japaneseRuns(question);
  if (runs.length === 0) return 0;
  const patternRuns = japaneseRuns(pattern);
  return patternRuns.some((p) =>
    runs.some((r) => {
      const common = longestCommon(r, p);
      return (
        common >= 3 || (common >= 2 && common === Math.min(r.length, p.length))
      );
    }),
  )
    ? 1
    : 0;
}

const LEXICAL_WEIGHT = 0.15;

/** Xếp hạng kết hợp vector + chữ; gộp các dòng trùng mẫu (cùng mẫu có ở nhiều giáo trình). */
export function rank(
  query: Float32Array,
  question: string,
  docs: IndexedDoc[],
  k: number,
): RankedSource[] {
  const scored = docs.map((d) => ({
    doc: d,
    score:
      (1 - LEXICAL_WEIGHT) * dot(query, d.vector) +
      LEXICAL_WEIGHT * lexicalScore(question, d.pattern),
  }));
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: RankedSource[] = [];
  for (const { doc, score } of scored) {
    const key = `${doc.pattern.replace(/\s+/g, "")}|${doc.jlptLevel ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      grammarId: doc.grammarId,
      pattern: doc.pattern,
      meaning: doc.meaning,
      jlptLevel: doc.jlptLevel,
      lessonId: doc.lessonId,
      lessonNumber: doc.lessonNumber,
      score: Math.round(score * 1000) / 1000,
      text: doc.text,
    });
    if (out.length === k) break;
  }
  return out;
}

export const SYSTEM_PROMPT = [
  "Bạn là gia sư ngữ pháp tiếng Nhật. Chỉ trả lời dựa trên các NGUỒN được cung cấp.",
  "Chỉ trả lời câu hỏi VỀ ngữ pháp, cách dùng mẫu câu hoặc cách nói một ý bằng tiếng Nhật.",
  'Nếu người dùng hỏi thông tin thực tế (giá cả, thời tiết, tin tức, lịch trình, lập trình…), KHÔNG trả lời, KHÔNG dịch câu hỏi, không ghi số nguồn; chỉ nói: "Mình chỉ trả lời câu hỏi về ngữ pháp tiếng Nhật. Bạn muốn hỏi cách nói câu này bằng tiếng Nhật không?"',
  "Mỗi ý lấy từ nguồn nào thì ghi số nguồn trong ngoặc vuông ngay sau ý đó, ví dụ [1] hoặc [2][3].",
  'Nếu các nguồn không đủ để trả lời, nói rõ: "Tài liệu của app chưa có thông tin này" và không tự bịa.',
  "Trả lời bằng tiếng Việt, ngắn gọn (tối đa khoảng 150 từ), có 1–2 ví dụ tiếng Nhật kèm nghĩa.",
].join("\n");

export function buildUserPrompt(
  question: string,
  sources: { text: string }[],
): string {
  const numbered = sources.map((s, i) => `[${i + 1}]\n${s.text}`).join("\n\n");
  return `NGUỒN:\n${numbered}\n\nCÂU HỎI: ${question}`;
}

/** Số nguồn mà câu trả lời trích, chỉ giữ số hợp lệ (1..n). AI bịa [7] khi chỉ có 5 nguồn thì bỏ. */
export function parseCitations(answer: string, n: number): number[] {
  const found = new Set<number>();
  for (const m of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const i = Number(m[1]);
    if (i >= 1 && i <= n) found.add(i);
  }
  return [...found].sort((a, b) => a - b);
}

/** Câu hỏi giống nhau (khác hoa thường, khoảng trắng) dùng chung cache. */
export function cacheKey(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}
