import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AiService, ChatMessage, type SentenceFeedback } from "./ai.service";

// Giới hạn độ dài: mỗi ký tự gửi lên là token AI phải trả tiền. Bản cũ không giới hạn câu hỏi,
// lịch sử hội thoại, hay `role` (gửi role tùy ý vào prompt).
class ChatMessageDto implements ChatMessage {
  @IsIn(["user", "assistant"]) role: "user" | "assistant";
  @IsString() @MaxLength(4000) content: string;
}

export class AskRequestDto {
  @IsString() @MaxLength(2000) question: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  context?: string;
}

export class SentenceFeedbackDto {
  @IsString() @IsNotEmpty() @MaxLength(500) sentence: string;
}

/** Gọi AI tốn tiền theo token: giới hạn chặt hơn mức chung 120/phút. */
const AI_THROTTLE = { default: { ttl: 600_000, limit: 30 } };

// Bản cũ đặt "ai" (thiếu "api/" như mọi controller khác): app gọi /api/ai/chat nên luôn 404,
// và nginx chỉ chuyển tiếp /api → gia sư AI không chạy trên app nào.
@Controller("api/ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  @HttpCode(200)
  @Throttle(AI_THROTTLE)
  async chat(@Body() dto: AskRequestDto): Promise<{ answer: string }> {
    const answer = await this.ai.ask(dto);
    return { answer };
  }

  @Post("sentence-feedback")
  @HttpCode(200)
  @Throttle(AI_THROTTLE)
  sentenceFeedback(
    @Body() dto: SentenceFeedbackDto,
  ): Promise<SentenceFeedback> {
    return this.ai.sentenceFeedback(dto.sentence.trim());
  }
}
