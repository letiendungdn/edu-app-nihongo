import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Delete,
  Query,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateVocabularyDto,
  LessonPaginationDto,
  ReorderVocabularyDto,
  UpdateVocabularyDto,
} from "@app/contracts";
import { Public, Roles, RolesGuard } from "@app/common";
import { PrismaService } from "@app/prisma";

@ApiTags("vocabularies")
@Controller("api/vocabularies")
export class VocabulariesController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  @Get("analysis-meta")
  @Public()
  @ApiOperation({ summary: "Metadata phân tích trợ từ và từ thường gặp trong câu ví dụ" })
  async analysisMeta() {
    return this.prisma.vocabAnalysisToken.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { surface: "asc" }],
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create vocabulary entry (admin)" })
  create(@Body() dto: CreateVocabularyDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_VOCABULARY, dto),
    );
  }

  @Get()
  @Public()
  // SPA (mora / từ điển tranh / chia động từ…) đọc nhiều trang; ceiling toàn cục 120
  // dễ 429 khi tải dải bài. GET công khai này nới hơn — auth/AI vẫn giữ limit chặt.
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  @ApiOperation({ summary: "List vocabularies, optionally by lesson" })
  findAll(@Query() query: LessonPaginationDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_VOCABULARIES, {
        lessonNumber: query.lessonNumber,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
        jlptLevel: query.jlptLevel,
        query: query.q,
        script: query.script,
      }),
    );
  }

  @Put("reorder")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder vocabularies in a lesson (admin)" })
  reorder(@Body() dto: ReorderVocabularyDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.REORDER_VOCABULARY, {
        lessonId: dto.lessonId,
        orderedIds: dto.orderedIds,
      }),
    );
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get vocabulary by id" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_VOCABULARY, { id: +id }),
    );
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update vocabulary entry (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateVocabularyDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_VOCABULARY, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete vocabulary (admin)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_VOCABULARY, { id: +id }),
    );
  }
}
