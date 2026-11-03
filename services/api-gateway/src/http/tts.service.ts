import "./edge-tts-ws-patch";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EdgeTTS } from "edge-tts-universal";

const SERVER_VOICES: Record<string, string> = {
  "vi-VN": "vi-VN-HoaiMyNeural",
  "ja-JP": "ja-JP-NanamiNeural",
};

const SYNTHESIZE_TIMEOUT_MS = 10_000;
/** Edge lỗi một lần thì bỏ qua Edge trong khoảng này, khỏi bắt mọi request chờ 10 giây. */
const EDGE_COOLDOWN_MS = 10 * 60_000;

/** Không có nhà cung cấp nào đọc được → controller trả 503 để web chuyển sang giọng của máy. */
export class TtsUnavailableError extends Error {}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSsml(text: string, lang: string, voice: string): string {
  return `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
}

/**
 * Đọc văn bản thành mp3, thử lần lượt:
 * 1. **Azure Speech** (dịch vụ chính thức của Microsoft, cùng giọng HoaiMy / Nanami) khi có
 *    AZURE_SPEECH_KEY + AZURE_SPEECH_REGION. Gói miễn phí F0: 500.000 ký tự / tháng.
 * 2. **Edge TTS** (`edge-tts-universal`): endpoint nội bộ của trình duyệt Edge, không có hợp đồng
 *    sử dụng nên có thể bị Microsoft chặn bất cứ lúc nào (từ 11/2026 trả 403). Lỗi thì nghỉ
 *    EDGE_COOLDOWN_MS rồi mới thử lại.
 * Cả hai đều không được → TtsUnavailableError (web đọc bằng giọng có sẵn trên máy).
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private edgeDownUntil = 0;

  constructor(@Optional() private readonly config?: ConfigService) {}

  async synthesize(text: string, lang: string): Promise<Buffer> {
    const voice = SERVER_VOICES[lang];
    if (!voice) {
      throw new Error(`Unsupported TTS language: ${lang}`);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Text is required");
    }

    const key = this.config?.get<string>("AZURE_SPEECH_KEY");
    const region = this.config?.get<string>("AZURE_SPEECH_REGION");
    if (key && region) {
      try {
        return await this.azure(trimmed, lang, voice, key, region);
      } catch (err) {
        this.logger.error(`Azure Speech failed for ${lang}`, err);
      }
    }

    if (Date.now() >= this.edgeDownUntil) {
      try {
        return await this.edge(trimmed, voice);
      } catch (err) {
        this.edgeDownUntil = Date.now() + EDGE_COOLDOWN_MS;
        this.logger.warn(
          `Edge TTS failed for ${lang}, skipping it for ${EDGE_COOLDOWN_MS / 60_000} minutes: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    throw new TtsUnavailableError("Server TTS is unavailable");
  }

  private async azure(
    text: string,
    lang: string,
    voice: string,
    key: string,
    region: string,
  ): Promise<Buffer> {
    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "edu-app-nihongo",
        },
        body: buildSsml(text, lang, voice),
        signal: AbortSignal.timeout(SYNTHESIZE_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      throw new Error(`Azure Speech HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  private async edge(text: string, voice: string): Promise<Buffer> {
    const tts = new EdgeTTS(text, voice);
    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        tts.synthesize(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Edge TTS timed out")),
            SYNTHESIZE_TIMEOUT_MS,
          );
        }),
      ]);
      return Buffer.from(await result.audio.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }
  }
}
