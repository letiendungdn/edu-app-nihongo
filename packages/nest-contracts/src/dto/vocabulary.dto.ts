import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const VOCAB_PARTS_OF_SPEECH = ['noun', 'i-adj', 'na-adj', 'verb', 'other'] as const;
export type VocabPartOfSpeech = (typeof VOCAB_PARTS_OF_SPEECH)[number];

export class CreateVocabularyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kanji?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  kana: string;

  @ApiProperty()
  @IsString()
  romaji: string;

  @ApiProperty()
  @IsString()
  meaning: string;

  /** Nghĩa tiếng Anh do người soạn nhập (meaningEnSource = manual); null để xóa khi cập nhật */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  meaningEn?: string | null;

  @ApiProperty()
  @IsInt()
  lessonId: number;

  @ApiPropertyOptional({ enum: VOCAB_PARTS_OF_SPEECH })
  @IsOptional()
  @IsIn(VOCAB_PARTS_OF_SPEECH)
  partOfSpeech?: VocabPartOfSpeech;

  /** URL ảnh (S3 /media/…) hoặc data URL; null để xóa khi cập nhật */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  exampleJa?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  exampleKana?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  exampleVi?: string | null;
}

export class UpdateVocabularyDto extends PartialType(CreateVocabularyDto) {}

export class ReorderVocabularyDto {
  @ApiProperty()
  @IsInt()
  lessonId: number;

  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  orderedIds: number[];
}
