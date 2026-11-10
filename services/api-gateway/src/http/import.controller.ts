import { Controller, Post, Body, Inject, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import { CONTENT_PATTERNS } from "@app/contracts";
import { Roles, RolesGuard } from "@app/common";

@ApiTags("import")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
@Controller("api/import")
export class ImportController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Post("vocab")
  @ApiOperation({ summary: "Import vocabulary from tab-separated text" })
  importVocab(@Body() body: { lessonNumber: number; text: string }) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.IMPORT_VOCAB, body),
    );
  }
}
