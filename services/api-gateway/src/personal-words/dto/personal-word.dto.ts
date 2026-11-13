import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { PaginationDto } from "@app/contracts";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Thêm một từ vào sổ cá nhân. ValidationPipe toàn cục (whitelist + forbidNonWhitelisted) chặn trường lạ. */
export class CreatePersonalWordDto {
  @ApiProperty({ example: "たべます" })
  @Transform(trim)
  @IsString({ message: "Nhập cách đọc" })
  @IsNotEmpty({ message: "Nhập cách đọc" })
  @Matches(/^[\u3040-\u30ff]+$/, { message: "Chỉ dùng hiragana hoặc katakana" })
  kana: string;

  @ApiProperty({ example: "ăn" })
  @Transform(trim)
  @IsString({ message: "Nhập nghĩa" })
  @IsNotEmpty({ message: "Nhập nghĩa" })
  @MaxLength(100, { message: "Nghĩa tối đa 100 ký tự" })
  meaning: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: 50 })
  @Type(() => Number) // "6" từ form → 6
  @IsInt({ message: "Bài phải là số nguyên" })
  @Min(1, { message: "Bài từ 1 tới 50" })
  @Max(50, { message: "Bài từ 1 tới 50" })
  lesson: number;
}

/** PATCH: mọi trường không bắt buộc (PartialType giữ nguyên luật kiểm của từng trường). */
export class UpdatePersonalWordDto extends PartialType(CreatePersonalWordDto) {}

export class ListPersonalWordsDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Lọc theo bài" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  lesson?: number;
}
