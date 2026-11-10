import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Role } from "@prisma/client";
import { Roles, RolesGuard } from "@app/common";
import { GrammarQaService } from "./grammar-qa.service";

export class GrammarQaDto {
  @IsString() @IsNotEmpty() @MaxLength(500) question: string;
}

// Phải khai báo TRƯỚC controller: decorator metadata của tham số @Query() đọc class này ngay lúc định nghĩa
// controller. Khai báo sau → "Cannot access 'SearchQueryDto' before initialization", gateway không khởi động.
export class SearchQueryDto {
  @IsString() @IsNotEmpty() @MaxLength(500) q: string;
}

/** Như các API AI khác: mỗi lần gọi tốn GPU/tiền token, giới hạn chặt hơn mức chung. */
const QA_THROTTLE = { default: { ttl: 600_000, limit: 30 } };

/**
 * Hỏi đáp ngữ pháp có trích nguồn (RAG). Cần đăng nhập (guard JWT toàn cục).
 * - POST /ask: câu trả lời + nguồn đã trích
 * - GET /search?q=: chỉ tìm nguồn, không gọi AI (rẻ; dùng cho đánh giá)
 * - POST /reindex, GET /status: admin tạo / kiểm tra chỉ mục
 */
@Controller("api/ai/grammar-qa")
export class GrammarQaController {
  constructor(private readonly qa: GrammarQaService) {}

  @Post("ask")
  @HttpCode(200)
  @Throttle(QA_THROTTLE)
  ask(@Body() dto: GrammarQaDto) {
    return this.qa.ask(dto.question);
  }

  @Get("search")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async search(@Query() dto: SearchQueryDto) {
    const { sources, embedMs, searchMs } = await this.qa.search(dto.q);
    return {
      sources: sources.map(({ text: _text, ...s }) => s),
      timingsMs: { embed: embedMs, search: searchMs },
    };
  }

  @Post("reindex")
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reindex() {
    return this.qa.reindex();
  }

  @Get("status")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  status() {
    return this.qa.status();
  }
}
