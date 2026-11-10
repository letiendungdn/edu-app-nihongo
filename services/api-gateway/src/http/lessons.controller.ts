import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Inject,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateLessonDto,
  UpdateLessonDto,
} from "@app/contracts";
import { JwtAuthGuard, Public, Roles, RolesGuard } from "@app/common";

@ApiTags("lessons")
@Controller("api/lessons")
export class LessonsController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a lesson (admin)" })
  create(@Body() dto: CreateLessonDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_LESSON, dto),
    );
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "List all lessons" })
  findAll(
    @Query("has") has?: "grammar" | "vocab",
    @Query("jlptLevel") jlptLevel?: string,
    @Query("q") q?: string,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_LESSONS, {
        has,
        jlptLevel: jlptLevel?.trim() || undefined,
        query: q?.trim() || undefined,
      }),
    );
  }

  @Get(":lessonNumber")
  @Public()
  @ApiOperation({ summary: "Get lesson by number" })
  findOne(@Param("lessonNumber", ParseIntPipe) lessonNumber: number) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_LESSON, { lessonNumber }),
    );
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a lesson (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateLessonDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_LESSON, { id: +id, dto }),
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a lesson (admin)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_LESSON, { id: +id }),
    );
  }
}
