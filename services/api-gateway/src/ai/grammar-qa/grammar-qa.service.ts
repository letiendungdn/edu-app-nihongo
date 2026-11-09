import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { AiService } from "../ai.service";
import { EmbeddingService } from "./embedding.service";
import {
  buildUserPrompt,
  bytesToVector,
  cacheKey,
  contentHash,
  docText,
  normalize,
  parseCitations,
  rank,
  SYSTEM_PROMPT,
  vectorToBytes,
  type GrammarDoc,
  type IndexedDoc,
  type RankedSource,
} from "./grammar-qa";

/** Số nguồn đưa cho AI. Nhiều hơn thì prompt dài (chậm, tốn token), ít hơn dễ sót mẫu đúng. */
const TOP_K = 5;
/**
 * Điểm thấp nhất của nguồn tốt nhất để được gọi AI. Thấp hơn nghĩa là câu hỏi không liên quan ngữ pháp trong app
 * (hỏi thời tiết, hỏi code…): trả lời "không tìm thấy" ngay, KHÔNG gọi AI → không tốn GPU, không bịa.
 * Chỉnh theo kết quả `npm run eval:grammar-qa`.
 */
export const MIN_SCORE = Number(process.env.GRAMMAR_QA_MIN_SCORE) || 0.45;
const EMBED_BATCH = 32;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;

export interface GrammarQaAnswer {
  answer: string;
  grounded: boolean;
  sources: (Omit<RankedSource, "text"> & { index: number; cited: boolean })[];
  model: string | null;
  cached: boolean;
  timingsMs: { embed: number; search: number; llm: number };
}

@Injectable()
export class GrammarQaService {
  private readonly logger = new Logger(GrammarQaService.name);
  private index: IndexedDoc[] | null = null;
  private loading: Promise<IndexedDoc[]> | null = null;
  private readonly cache = new Map<string, { at: number; value: GrammarQaAnswer }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly embedder: EmbeddingService,
  ) {}

  /** Tạo / cập nhật embedding. Chỉ embed lại mẫu có nội dung hoặc model đổi (so `contentHash`). */
  async reindex(): Promise<{ total: number; embedded: number; unchanged: number; removed: number; ms: number }> {
    const started = Date.now();
    const docs = await this.loadDocs();
    const existing = new Map(
      (await this.prisma.grammarEmbedding.findMany({ select: { grammarId: true, contentHash: true } })).map(
        (e) => [e.grammarId, e.contentHash],
      ),
    );

    const todo = docs
      .map((d) => {
        const text = docText(d);
        return { doc: d, text, hash: contentHash(text, this.embedder.model) };
      })
      .filter((x) => existing.get(x.doc.grammarId) !== x.hash);

    for (let i = 0; i < todo.length; i += EMBED_BATCH) {
      const batch = todo.slice(i, i + EMBED_BATCH);
      const vectors = await this.embedder.embed(batch.map((b) => b.text));
      await this.prisma.$transaction(
        batch.map((b, j) => {
          const data = {
            model: this.embedder.model,
            contentHash: b.hash,
            dims: vectors[j].length,
            vector: vectorToBytes(normalize(vectors[j])),
          };
          return this.prisma.grammarEmbedding.upsert({
            where: { grammarId: b.doc.grammarId },
            create: { grammarId: b.doc.grammarId, ...data },
            update: data,
          });
        }),
      );
    }

    // Mẫu đã bị xóa khỏi Grammar thì khóa ngoại tự xóa embedding (ON DELETE CASCADE); dòng của model cũ thì xóa ở đây.
    const removed = await this.prisma.grammarEmbedding.deleteMany({
      where: { model: { not: this.embedder.model } },
    });

    this.index = null;
    this.cache.clear();
    const result = {
      total: docs.length,
      embedded: todo.length,
      unchanged: docs.length - todo.length,
      removed: removed.count,
      ms: Date.now() - started,
    };
    this.logger.log(`Reindex hỏi đáp ngữ pháp: ${JSON.stringify(result)}`);
    return result;
  }

  async status(): Promise<{ indexed: number; grammar: number; model: string }> {
    const [indexed, grammar] = await Promise.all([
      this.prisma.grammarEmbedding.count({ where: { model: this.embedder.model } }),
      this.prisma.grammar.count(),
    ]);
    return { indexed, grammar, model: this.embedder.model };
  }

  /** Chỉ tìm nguồn, không gọi AI: dùng cho bộ đánh giá và để xem nhanh "mẫu liên quan". */
  async search(question: string, k = TOP_K): Promise<{ sources: RankedSource[]; embedMs: number; searchMs: number }> {
    const index = await this.getIndex();
    const t0 = Date.now();
    const [raw] = await this.embedder.embed([this.embedder.queryText(question)]);
    const t1 = Date.now();
    const sources = rank(normalize(raw), question, index, k);
    return { sources, embedMs: t1 - t0, searchMs: Date.now() - t1 };
  }

  async ask(question: string): Promise<GrammarQaAnswer> {
    const key = cacheKey(question);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, cached: true };

    const { sources, embedMs, searchMs } = await this.search(question);
    const best = sources[0]?.score ?? 0;
    const strip = (s: RankedSource, i: number, cited: boolean) => {
      const { text: _text, ...rest } = s;
      return { ...rest, index: i + 1, cited };
    };

    if (best < MIN_SCORE) {
      const value: GrammarQaAnswer = {
        answer:
          "Mình chưa tìm thấy mẫu ngữ pháp nào trong tài liệu của app khớp với câu hỏi này. Thử hỏi cụ thể hơn, ví dụ “cách nói đã từng làm gì”, hoặc gõ thẳng mẫu như 「たことがある」.",
        grounded: false,
        sources: sources.slice(0, 3).map((s, i) => strip(s, i, false)),
        model: null,
        cached: false,
        timingsMs: { embed: embedMs, search: searchMs, llm: 0 },
      };
      this.log(question, value, best);
      return value;
    }

    const t0 = Date.now();
    const answer = (
      await this.ai.generate(SYSTEM_PROMPT, buildUserPrompt(question, sources), {
        temperature: 0.2,
        maxTokens: 700,
      })
    ).trim();
    const llm = Date.now() - t0;
    const cited = new Set(parseCitations(answer, sources.length));

    const value: GrammarQaAnswer = {
      answer,
      // Không trích nguồn nào nghĩa là AI không bám tài liệu: đánh dấu để giao diện cảnh báo.
      grounded: cited.size > 0,
      sources: sources.map((s, i) => strip(s, i, cited.has(i + 1))),
      model: this.ai.modelName,
      cached: false,
      timingsMs: { embed: embedMs, search: searchMs, llm },
    };
    this.remember(key, value);
    this.log(question, value, best);
    return value;
  }

  private remember(key: string, value: GrammarQaAnswer) {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { at: Date.now(), value });
  }

  /** Một dòng log có cấu trúc mỗi câu hỏi: theo dõi độ trễ từng bước và tỷ lệ "không tìm thấy". */
  private log(question: string, value: GrammarQaAnswer, best: number) {
    this.logger.log(
      JSON.stringify({
        event: "grammar_qa",
        chars: question.length,
        bestScore: best,
        grounded: value.grounded,
        cited: value.sources.filter((s) => s.cited).length,
        ...value.timingsMs,
      }),
    );
  }

  private getIndex(): Promise<IndexedDoc[]> {
    if (this.index) return Promise.resolve(this.index);
    this.loading ??= this.loadIndex().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async loadIndex(): Promise<IndexedDoc[]> {
    const rows = await this.prisma.grammarEmbedding.findMany({
      where: { model: this.embedder.model },
      select: {
        vector: true,
        grammar: {
          select: {
            id: true,
            pattern: true,
            meaning: true,
            explanation: true,
            jlptLevel: true,
            lessonId: true,
            lesson: { select: { lessonNumber: true } },
            examples: { select: { jp: true, vi: true }, orderBy: { sortOrder: "asc" }, take: 3 },
          },
        },
      },
    });
    if (rows.length === 0) {
      throw new ServiceUnavailableException(
        "Chưa tạo chỉ mục hỏi đáp ngữ pháp. Admin chạy: POST /api/ai/grammar-qa/reindex",
      );
    }
    const index = rows.map((r) => {
      const g = r.grammar;
      const doc: GrammarDoc = {
        grammarId: g.id,
        pattern: g.pattern,
        meaning: g.meaning,
        explanation: g.explanation,
        jlptLevel: g.jlptLevel,
        lessonId: g.lessonId,
        examples: g.examples,
      };
      return {
        grammarId: g.id,
        pattern: g.pattern,
        meaning: g.meaning,
        jlptLevel: g.jlptLevel,
        lessonId: g.lessonId,
        lessonNumber: g.lesson?.lessonNumber ?? null,
        text: docText(doc),
        vector: bytesToVector(r.vector),
      };
    });
    this.index = index;
    return index;
  }

  private async loadDocs(): Promise<GrammarDoc[]> {
    const rows = await this.prisma.grammar.findMany({
      select: {
        id: true,
        pattern: true,
        meaning: true,
        explanation: true,
        jlptLevel: true,
        lessonId: true,
        examples: { select: { jp: true, vi: true }, orderBy: { sortOrder: "asc" }, take: 3 },
      },
      orderBy: { id: "asc" },
    });
    return rows.map((g) => ({ grammarId: g.id, ...g }));
  }
}
