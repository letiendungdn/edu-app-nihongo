import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

/** Pagination + optional lesson filter (query string may include both). */
export class LessonPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by Minna lesson number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lessonNumber?: number;

  @ApiPropertyOptional({ description: 'Filter by JLPT level', enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @IsOptional()
  @IsIn(['N5', 'N4', 'N3', 'N2', 'N1'])
  jlptLevel?: string;

  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Chỉ lấy từ có dạng viết là katakana',
    enum: ['katakana'],
  })
  @IsOptional()
  @IsIn(['katakana'])
  script?: 'katakana';
}
