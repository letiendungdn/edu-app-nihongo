import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

/**
 * Gọi model embedding trên Ollama (`POST /api/embed`). Mặc định `qwen3-embedding:0.6b`: đa ngôn ngữ (Nhật + Việt),
 * nhẹ (~640 MB), vector 1024 chiều.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly base = (
    process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  readonly model =
    process.env.LOCAL_AI_EMBED_MODEL?.trim() || "qwen3-embedding:0.6b";
  private readonly timeoutMs =
    Number(process.env.LOCAL_AI_TIMEOUT_MS) || 120_000;

  /**
   * Qwen3-Embedding khuyên thêm câu chỉ dẫn cho CÂU HỎI (không thêm cho tài liệu): độ chính xác tìm kiếm cao hơn.
   */
  queryText(question: string): string {
    return `Instruct: Tìm mẫu ngữ pháp tiếng Nhật giải đáp câu hỏi của người học\nQuery: ${question}`;
  }

  async embed(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];
    try {
      const res = await fetch(`${this.base}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, input: inputs }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Embedding lỗi ${res.status}: ${body.slice(0, 200)}`);
        throw new ServiceUnavailableException(
          `Model embedding lỗi (${res.status}). Chạy: ollama pull ${this.model}`,
        );
      }
      const data = (await res.json()) as { embeddings?: number[][] };
      if (!data.embeddings || data.embeddings.length !== inputs.length) {
        throw new ServiceUnavailableException(
          "Model embedding trả về sai số lượng vector",
        );
      }
      return data.embeddings;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error("Không gọi được model embedding", error);
      throw new ServiceUnavailableException(
        `Không nối được Ollama (${this.base}) để tạo embedding`,
      );
    }
  }
}
