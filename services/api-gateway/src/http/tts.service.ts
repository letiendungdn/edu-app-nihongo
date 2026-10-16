import "./edge-tts-ws-patch";
import { Injectable, Logger } from "@nestjs/common";
import { EdgeTTS } from "edge-tts-universal";

const SERVER_VOICES: Record<string, string> = {
  "vi-VN": "vi-VN-HoaiMyNeural",
  "ja-JP": "ja-JP-NanamiNeural",
};

const SYNTHESIZE_TIMEOUT_MS = 10_000;

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  async synthesize(text: string, lang: string): Promise<Buffer> {
    const voice = SERVER_VOICES[lang];
    if (!voice) {
      throw new Error(`Unsupported TTS language: ${lang}`);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Text is required");
    }

    try {
      const tts = new EdgeTTS(trimmed, voice);
      const result = await Promise.race([
        tts.synthesize(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Edge TTS timed out")),
            SYNTHESIZE_TIMEOUT_MS,
          );
        }),
      ]);
      const arrayBuffer = await result.audio.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error(`Edge TTS failed for ${lang}`, err);
      throw err;
    }
  }
}
