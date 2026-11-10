import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateGrammarDto,
  LessonPaginationDto,
  UpdateGrammarDto,
} from "@app/contracts";
import { Public, Roles, RolesGuard } from "@app/common";
import { KanaRomajiService } from "./kana-romaji.service";

type GrammarExampleRow = {
  id: number;
  jp: string;
  romaji: string;
  en?: string | null;
  vi?: string | null;
};

type GrammarRow = {
  id: number;
  pattern: string;
  meaning: string;
  explanation?: string | null;
  lessonId: number;
  examples?: GrammarExampleRow[];
};

type GrammarListResponse = {
  data: GrammarRow[];
  total: number;
  page: number;
  limit: number;
};

@ApiTags("grammars")
@Controller("api/grammars")
export class GrammarsController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
    private readonly kanaRomaji: KanaRomajiService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create grammar entry (admin)" })
  create(@Body() dto: CreateGrammarDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_GRAMMAR, dto),
    );
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "List grammars, optionally by lesson" })
  async findAll(@Query() query: LessonPaginationDto) {
    const result = await firstValueFrom(
      this.contentClient.send<GrammarListResponse>(
        CONTENT_PATTERNS.GET_GRAMMARS,
        {
          lessonNumber: query.lessonNumber,
          page: query.page ?? 1,
          limit: query.limit ?? 50,
          jlptLevel: query.jlptLevel,
          query: query.q,
        },
      ),
    );
    return this.enrichGrammarList(result);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get grammar by id" })
  async findOne(@Param("id") id: string) {
    const grammar = await firstValueFrom(
      this.contentClient.send<GrammarRow | null>(CONTENT_PATTERNS.GET_GRAMMAR, {
        id: +id,
      }),
    );
    if (!grammar) return grammar;
    return this.enrichGrammar(grammar);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update grammar entry (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateGrammarDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_GRAMMAR, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete grammar (admin)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_GRAMMAR, { id: +id }),
    );
  }

  private async enrichGrammarList(
    result: GrammarListResponse,
  ): Promise<GrammarListResponse> {
    if (!result?.data?.length) return result;
    const data = await Promise.all(
      result.data.map((grammar) => this.enrichGrammar(grammar)),
    );
    return { ...result, data };
  }

  private stripInlineFurigana(text: string): string {
    return text
      .replace(/([一-龯])\s+([\u3040-\u309F\u30A0-\u30FF]+)/g, "$2")
      .replace(/\s+/g, " ")
      .trim();
  }

  private async enrichGrammar(grammar: GrammarRow): Promise<GrammarRow> {
    if (!grammar.examples?.length) return grammar;

    const examples = await Promise.all(
      grammar.examples.map(async (example) => {
        if (example.romaji?.trim()) return example;
        const jpForReading = this.stripInlineFurigana(example.jp);
        const reading = await this.kanaRomaji.resolveReading(jpForReading);
        return {
          ...example,
          romaji: reading.romaji?.trim() || example.romaji,
        };
      }),
    );

    return { ...grammar, examples };
  }
}
