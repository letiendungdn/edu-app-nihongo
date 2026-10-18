import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskDto {
  question: string;
  history?: ChatMessage[];
  context?: string;
}

export interface SentenceFeedback {
  corrected: string;
  reading: string;
  meaning: string;
  explanation: string;
  examples: string[];
}

interface GenOptions {
  temperature: number;
  maxTokens: number;
}

const CHAT_OPTIONS: GenOptions = { temperature: 0.7, maxTokens: 600 };
const SENTENCE_OPTIONS: GenOptions = { temperature: 0.3, maxTokens: 512 };

const SENTENCE_PROMPT = [
  "Bạn là gia sư tiếng Nhật. Người học gửi một câu tiếng Nhật (hoặc tiếng Việt để nhờ dịch).",
  'Chỉ trả về JSON thuần, không markdown: {"corrected":"","reading":"","meaning":"","explanation":"","examples":[]}.',
  "corrected: câu đã sửa (rỗng nếu câu đúng). reading: furigana hoặc romaji. meaning, explanation: tiếng Việt, ngắn gọn.",
  "examples: tối đa 2 câu ví dụ tương tự bằng tiếng Nhật.",
].join("\n");

/**
 * Chuẩn hóa phản hồi của model (hay bọc ```json, thiếu field, sai kiểu). Hàm thuần để test.
 * Không parse được → null.
 */
export function parseSentenceFeedback(raw: string): SentenceFeedback | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      json = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    corrected: str(o.corrected),
    reading: str(o.reading),
    meaning: str(o.meaning),
    explanation: str(o.explanation),
    examples: Array.isArray(o.examples)
      ? o.examples
          .filter((e): e is string => typeof e === "string" && e.trim() !== "")
          .slice(0, 5)
      : [],
  };
}

type AiProvider = "ollama" | "gemini";

function resolveProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "gemini") return "gemini";
  return "ollama";
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider = resolveProvider();
  private readonly localBase = (
    process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  private readonly model = process.env.LOCAL_AI_MODEL?.trim() || "qwen2.5:7b";
  private readonly gemini =
    this.provider === "gemini" && process.env.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;

  async ask(dto: AskDto): Promise<string> {
    const { question, history = [], context } = dto;

    const systemInstruction = [
      "Bạn là gia sư tiếng Nhật thân thiện và kiên nhẫn.",
      "Giải thích ngắn gọn, dùng ví dụ thực tế từ cuộc sống.",
      "Khi đưa ví dụ: ghi tiếng Nhật, rồi romaji trong ngoặc, rồi nghĩa tiếng Việt.",
      "Trả lời bằng tiếng Việt. Giữ nguyên chữ Nhật khi cần.",
      context ? `Học viên đang học: ${context}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (this.provider === "ollama") {
      return this.askOllama(systemInstruction, question, history, CHAT_OPTIONS);
    }

    return this.askGemini(systemInstruction, question, history, CHAT_OPTIONS);
  }

  /**
   * Sửa và giải thích một câu. Trước đây web, iOS, Android, Expo, Flutter mỗi nơi tự gọi Gemini
   * bằng API key NẰM TRONG APP (ai bắt request cũng lấy được key). Giờ chỉ server giữ key.
   */
  async sentenceFeedback(sentence: string): Promise<SentenceFeedback> {
    const raw =
      this.provider === "ollama"
        ? await this.askOllama(SENTENCE_PROMPT, sentence, [], SENTENCE_OPTIONS)
        : await this.askGemini(SENTENCE_PROMPT, sentence, [], SENTENCE_OPTIONS);
    const parsed = parseSentenceFeedback(raw);
    if (!parsed) {
      this.logger.warn(`AI trả về không phải JSON: ${raw.slice(0, 300)}`);
      throw new BadGatewayException("AI trả về sai định dạng, thử lại nhé");
    }
    return parsed;
  }

  private async askOllama(
    systemInstruction: string,
    question: string,
    history: ChatMessage[],
    options: GenOptions,
  ): Promise<string> {
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    try {
      const res = await fetch(`${this.localBase}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Ollama error ${res.status}: ${err}`);
        throw new ServiceUnavailableException(
          `Ollama lỗi (${res.status}) tại ${this.localBase}. Chạy: open -a Ollama && ollama pull ${this.model}`,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error("Ollama unreachable", error);
      throw new ServiceUnavailableException(
        `Không nối được Ollama (${this.localBase}). Chạy: open -a Ollama && ollama pull ${this.model}`,
      );
    }
  }

  private async askGemini(
    systemInstruction: string,
    question: string,
    history: ChatMessage[],
    options: GenOptions,
  ): Promise<string> {
    if (!this.gemini) {
      throw new ServiceUnavailableException(
        "GEMINI_API_KEY chưa đặt (hoặc đặt AI_PROVIDER=ollama để dùng model trên máy).",
      );
    }

    const geminiHistory = history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const chat = this.gemini.chats.create({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction,
          maxOutputTokens: options.maxTokens,
          temperature: options.temperature,
        },
        history: geminiHistory,
      });

      const response = await chat.sendMessage({ message: question });
      return response.text ?? "";
    } catch (error) {
      // Chi tiết lỗi của Google chỉ ghi log; bản cũ ném nguyên ra → client thấy thông điệp nội bộ
      this.logger.error("Gemini API error", error);
      throw new ServiceUnavailableException("AI đang gặp sự cố, thử lại sau");
    }
  }
}
