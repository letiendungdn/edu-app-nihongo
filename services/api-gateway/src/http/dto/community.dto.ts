import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

// ValidationPipe toàn cục bật forbidNonWhitelisted: field không có decorator bị coi
// là "should not exist", nên mọi field ở đây đều cần decorator.

export class CreateGroupDto {
  @ApiProperty({ example: "Nhóm N3" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ type: [Number], example: [4, 5] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  memberIds?: number[];
}

export class DirectChatDto {
  @ApiProperty({ example: 4 })
  @IsInt()
  @IsPositive()
  userId!: number;
}

export class AddMembersDto {
  @ApiPropertyOptional({ type: [Number], example: [6] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  memberIds?: number[];
}
