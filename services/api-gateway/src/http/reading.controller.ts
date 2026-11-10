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
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateReadingPassageDto,
  UpdateReadingPassageDto,
} from "@app/contracts";
import { Public, Roles, RolesGuard, type AuthUserPayload } from "@app/common";

@ApiTags("reading")
@Controller("api/reading")
export class ReadingController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List reading passages" })
  findAll(@Query("jlptLevel") jlptLevel?: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_READING_PASSAGES, {
        jlptLevel,
      }),
    );
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get reading passage with questions" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_READING_PASSAGE, {
        id: +id,
      }),
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create reading passage (admin)" })
  create(@Body() dto: CreateReadingPassageDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_READING_PASSAGE, dto),
    );
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update reading passage (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateReadingPassageDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_READING_PASSAGE, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete reading passage (admin)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_READING_PASSAGE, {
        id: +id,
      }),
    );
  }

  @Post(":id/submit")
  @Public()
  @ApiOperation({ summary: "Submit reading answers" })
  submit(
    @Param("id") id: string,
    @Body() body: { answers: Record<string, string> },
    @Req() req: { user?: AuthUserPayload | null },
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.SUBMIT_READING, {
        passageId: +id,
        answers: body.answers,
        userId: req.user?.id ?? null,
      }),
    );
  }
}
