import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { AddSplitDto } from './add-split.dto';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

// We only really want to update commissionRate, platformId shouldn't change for an existing split ID
export class UpdateSplitDto {
  @ApiProperty({
    example: 0.5,
    description: 'New commission split (0.0 to 1.0)',
    minimum: 0,
    maximum: 100, // Matching logic with Max(100) though 0-1 matches description better
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;
}
