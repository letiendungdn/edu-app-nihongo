import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateKanjiVocabDto,
  CreateKanjiEntryDto,
  CreateKanjiLessonDto,
  ReorderKanjiVocabDto,
  UpdateKanjiVocabDto,
  UpdateKanjiEntryDto,
  UpdateKanjiLessonDto,
} from "@app/contracts";
import { JwtAuthGuard, Public, Roles, RolesGuard } from "@app/common";

@ApiTags("kanji")
@Controller("api")
export class KanjiController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Get("kanji-lessons")
  @Public()
  @ApiOperation({ summary: "List kanji lessons" })
  findAllLessons() {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_KANJI_LESSONS, {}),
    );
  }

  @Post("kanji-lessons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create kanji lesson (admin)" })
  createLesson(@Body() dto: CreateKanjiLessonDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_KANJI_LESSON, dto),
    );
  }

  @Patch("kanji-lessons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update kanji lesson (admin)" })
  updateLesson(@Param("id") id: string, @Body() dto: UpdateKanjiLessonDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_KANJI_LESSON, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete("kanji-lessons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete kanji lesson (admin)" })
  removeLesson(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_KANJI_LESSON, {
        id: +id,
      }),
    );
  }

  @Get("kanji-components")
  @Public()
  @ApiOperation({ summary: "List kanji components / radicals (structure panel)" })
  findComponents() {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_KANJI_COMPONENTS, {}),
    );
  }

  @Get("kanji")
  @Public()
  @ApiOperation({ summary: "List kanji entries" })
  findEntries(
    @Query("lessonNumber") lessonNumber?: string,
    @Query("q") q?: string,
    @Query("jlptLevel") jlptLevel?: string,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_KANJI_ENTRIES, {
        lessonNumber: lessonNumber ? +lessonNumber : undefined,
        query: q?.trim() || undefined,
        jlptLevel: jlptLevel?.trim() || undefined,
      }),
    );
  }

  @Get("kanji/:id")
  @Public()
  @ApiOperation({ summary: "Get kanji entry by id" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_KANJI_ENTRY, { id: +id }),
    );
  }

  @Post("kanji")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create kanji entry (admin)" })
  createEntry(@Body() dto: CreateKanjiEntryDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_KANJI_ENTRY, dto),
    );
  }

  @Patch("kanji/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update kanji entry (admin)" })
  updateEntry(@Param("id") id: string, @Body() dto: UpdateKanjiEntryDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_KANJI_ENTRY, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete("kanji/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete kanji entry (admin)" })
  removeEntry(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_KANJI_ENTRY, { id: +id }),
    );
  }

  @Post("kanji/:entryId/vocabularies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add related vocabulary to a kanji entry (admin)" })
  createVocab(
    @Param("entryId") entryId: string,
    @Body() dto: CreateKanjiVocabDto,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_KANJI_VOCAB, {
        kanjiEntryId: +entryId,
        dto,
      }),
    );
  }

  @Put("kanji/:entryId/vocabularies/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder related vocabularies (admin)" })
  reorderVocab(
    @Param("entryId") entryId: string,
    @Body() dto: ReorderKanjiVocabDto,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.REORDER_KANJI_VOCAB, {
        kanjiEntryId: +entryId,
        orderedIds: dto.orderedIds,
      }),
    );
  }

  @Patch("kanji-vocab/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update related vocabulary (admin)" })
  updateVocab(@Param("id") id: string, @Body() dto: UpdateKanjiVocabDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_KANJI_VOCAB, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete("kanji-vocab/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete related vocabulary (admin)" })
  removeVocab(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_KANJI_VOCAB, { id: +id }),
    );
  }
}
