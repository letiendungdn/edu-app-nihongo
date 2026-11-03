import {
  BadRequestException,
  Body,
  ServiceUnavailableException,
  Controller,
  Post,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "@app/common";
import { TtsDto } from "./dto/tts.dto";
import { TtsService, TtsUnavailableError } from "./tts.service";

@ApiTags("tts")
@Controller("api/tts")
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post()
  @Public()
  // Công khai và mỗi lần gọi tốn một lượt Edge TTS → giới hạn riêng theo IP. Web phát tuần tự
  // (đọc xong câu này mới gọi câu sau, kể cả "phát tất cả"), nên 60 lần/phút là dư.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: "Text-to-speech (Edge TTS) — vi-VN / ja-JP" })
  async synthesize(@Body() dto: TtsDto, @Res() res: Response) {
    try {
      const audio = await this.ttsService.synthesize(dto.text, dto.lang);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(audio);
    } catch (err) {
      // 503 + Retry-After: web hiểu là "server không đọc được lúc này" và đọc bằng giọng của máy.
      if (err instanceof TtsUnavailableError) {
        res.setHeader("Retry-After", "300");
        throw new ServiceUnavailableException(err.message);
      }
      const message = err instanceof Error ? err.message : "TTS failed";
      throw new BadRequestException(message);
    }
  }
}
