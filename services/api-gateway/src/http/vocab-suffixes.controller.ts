import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import {
  CONTENT_PATTERNS,
  CreateVocabSuffixGroupDto,
  CreateVocabSuffixItemDto,
  ReorderVocabSuffixItemsDto,
  UpdateVocabSuffixGroupDto,
  UpdateVocabSuffixItemDto,
} from "@app/contracts";
import { Roles, RolesGuard } from "@app/common";

@ApiTags("vocab-suffixes")
@Controller("api/vocab-suffixes")
export class VocabSuffixesController {
  constructor(
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
  ) {}

  @Post("groups")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create vocab suffix group (admin)" })
  createGroup(@Body() dto: CreateVocabSuffixGroupDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_VOCAB_SUFFIX_GROUP, dto),
    );
  }

  @Patch("groups/:slug")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update vocab suffix group (admin)" })
  updateGroup(
    @Param("slug") slug: string,
    @Body() dto: UpdateVocabSuffixGroupDto,
  ) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_VOCAB_SUFFIX_GROUP, {
        slug,
        dto,
      }),
    );
  }

  @Delete("groups/:slug")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete vocab suffix group (admin)" })
  removeGroup(@Param("slug") slug: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_VOCAB_SUFFIX_GROUP, {
        slug,
      }),
    );
  }

  @Put("items/reorder")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder vocab suffix items in a group (admin)" })
  reorderItems(@Body() dto: ReorderVocabSuffixItemsDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.REORDER_VOCAB_SUFFIX_ITEMS, dto),
    );
  }

  @Post("items")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create vocab suffix item (admin)" })
  createItem(@Body() dto: CreateVocabSuffixItemDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.CREATE_VOCAB_SUFFIX_ITEM, dto),
    );
  }

  @Patch("items/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update vocab suffix item (admin)" })
  updateItem(@Param("id") id: string, @Body() dto: UpdateVocabSuffixItemDto) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.UPDATE_VOCAB_SUFFIX_ITEM, {
        id: +id,
        dto,
      }),
    );
  }

  @Delete("items/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete vocab suffix item (admin)" })
  removeItem(@Param("id") id: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.DELETE_VOCAB_SUFFIX_ITEM, {
        id: +id,
      }),
    );
  }
}
