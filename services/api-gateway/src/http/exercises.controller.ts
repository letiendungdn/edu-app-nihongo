import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateExerciseDto,
  UpdateExerciseDto,
} from "@app/contracts";
import { Public, Roles, RolesGuard } from "@app/common";

@ApiTags("exercises")
@Controller("api/exercises")
export class ExercisesController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create exercise (admin)" })
  create(@Body() dto: CreateExerciseDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_EXERCISE, dto),
    );
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "List exercises, optionally by lesson" })
  findAll(
    @Query("lessonNumber") lessonNumber?: string,
    @Query("jlptLevel") jlptLevel?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_EXERCISES, {
        lessonNumber: lessonNumber ? +lessonNumber : undefined,
        jlptLevel: jlptLevel?.trim() || undefined,
        query: q?.trim() || undefined,
        page: page ? +page : undefined,
        limit: limit ? +limit : undefined,
      }),
    );
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get exercise by id" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_EXERCISE, { id: +id }),
    );
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update exercise (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateExerciseDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_EXERCISE, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete exercise (admin)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_EXERCISE, { id: +id }),
    );
  }
}
