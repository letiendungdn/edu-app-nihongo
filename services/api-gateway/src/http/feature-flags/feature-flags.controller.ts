import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  Public,
  Roles,
  RolesGuard,
} from "@app/common";
import type { AuthRequest } from "@app/common/auth/current-user.decorator";
import { FeatureFlagsService } from "./feature-flags.service";

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class CreateFeatureFlagDto extends UpdateFeatureFlagDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,63}$/, {
    message: "key chỉ gồm chữ thường, số, dấu gạch ngang",
  })
  key!: string;
}

@ApiTags("feature-flags")
@Controller("api")
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get("feature-flags")
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      "Các feature flag đang bật cho người xem (khách hoặc đã đăng nhập)",
  })
  async enabled(@Req() req: AuthRequest) {
    return { enabled: await this.flags.enabledKeys(req.user?.role ?? null) };
  }

  @Get("admin/feature-flags")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Danh sách feature flag (admin)" })
  list() {
    return this.flags.listAll();
  }

  @Post("admin/feature-flags")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo feature flag (admin) — mặc định TẮT" })
  create(@Body() dto: CreateFeatureFlagDto) {
    return this.flags.create(dto);
  }

  @Patch("admin/feature-flags/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Bật/tắt, đổi vai trò được thấy (admin) — có hiệu lực trong ≤ 30s, không cần deploy",
  })
  update(@Param("key") key: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.flags.update(key, dto);
  }
}
