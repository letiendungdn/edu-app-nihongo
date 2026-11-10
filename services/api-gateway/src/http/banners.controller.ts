import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Public, Roles, RolesGuard } from "@app/common";
import { BannersService } from "./banners.service";
import { DeleteBannerDto, UpsertBannerDto } from "./dto/banner.dto";

@ApiTags("banners")
@Controller("api/banners")
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Cấu hình ảnh nền trang (public)" })
  getConfig() {
    return this.banners.getConfig();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đặt ảnh nền global hoặc theo trang (admin)" })
  upsert(@Body() dto: UpsertBannerDto) {
    return this.banners.upsert(dto.scope, dto.path, dto.image);
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xóa ảnh nền (admin)" })
  remove(@Query() dto: DeleteBannerDto) {
    return this.banners.remove(dto.scope, dto.path);
  }
}
