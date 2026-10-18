import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MindMapKind, Role } from "@prisma/client";
import { JwtAuthGuard, Public, Roles, RolesGuard } from "@app/common";
import { MindMapsService } from "./mind-maps.service";
import { MindMapDataService } from "./mind-map-data.service";
import {
  CreateMindMapLevelDto,
  UpdateMindMapLevelDto,
  UpsertMindMapsDto,
} from "./dto/mind-map.dto";

@ApiTags("mind-maps")
@Controller("api/mind-maps")
export class MindMapsController {
  constructor(
    private readonly mindMaps: MindMapsService,
    private readonly mindMapData: MindMapDataService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: "List mind maps (optional ?kind=GRAMMAR|VOCAB|KANJI)",
  })
  list(@Query("kind") kind?: string) {
    return this.mindMaps.list(kind);
  }

  @Post("bulk-upsert")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upsert nhiều sơ đồ / seed mặc định (admin)" })
  bulkUpsert(@Body() dto: UpsertMindMapsDto) {
    return this.mindMaps.upsertMany(dto.levels, dto.replaceKind);
  }

  /** Đặt trước ":id" — nếu không, "data" bị ParseIntPipe của ":id" bắt nhầm. */
  @Get("data")
  @Public()
  @ApiOperation({
    summary:
      "Sơ đồ sinh từ toàn bộ dữ liệu (?kind=GRAMMAR|VOCAB|KANJI), mỗi cấp tối đa 8 nhánh",
  })
  data(@Query("kind") kind?: string) {
    const upper = kind?.toUpperCase();
    if (!upper || !(Object.values(MindMapKind) as string[]).includes(upper)) {
      throw new BadRequestException("kind phải là GRAMMAR, VOCAB hoặc KANJI");
    }
    return this.mindMapData.build(upper as MindMapKind);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get mind map by id" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.mindMaps.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create mind map level (admin)" })
  create(@Body() dto: CreateMindMapLevelDto) {
    return this.mindMaps.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update mind map level (admin)" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMindMapLevelDto,
  ) {
    return this.mindMaps.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete mind map level (admin)" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.mindMaps.remove(id);
  }
}
