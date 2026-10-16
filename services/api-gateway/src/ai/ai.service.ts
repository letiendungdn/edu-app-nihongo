import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
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
      return this.askOllama(systemInstruction, question, history);
    }

    return this.askGemini(systemInstruction, question, history);
  }

  private async askOllama(
    systemInstruction: string,
    question: string,
    history: ChatMessage[],
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
          temperature: 0.7,
          max_tokens: 600,
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
          maxOutputTokens: 600,
          temperature: 0.7,
        },
        history: geminiHistory,
      });

      const response = await chat.sendMessage({ message: question });
      return response.text ?? "";
    } catch (error) {
      this.logger.error("Gemini API error", error);
      throw error;
    }
  }
}
