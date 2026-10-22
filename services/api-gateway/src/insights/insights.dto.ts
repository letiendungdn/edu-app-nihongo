import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";

export class ReengageLearnerDto {
  @IsInt()
  userId!: number;

  @IsInt()
  @Min(0)
  daysInactive!: number;

  @IsInt()
  @Min(0)
  dueCards!: number;

  @IsOptional()
  @IsInt()
  riskScore?: number;
}

export class ReengagementBatchDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  day!: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ReengageLearnerDto)
  learners!: ReengageLearnerDto[];
}
