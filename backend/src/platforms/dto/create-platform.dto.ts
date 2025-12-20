import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformDto {
  @ApiProperty({
    example: 'Platform',
    description: 'Display name of the platform',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'MG Billing Ltd',
    description: 'Legal corporate name',
  })
  @IsString()
  @IsOptional()
  corporateName?: string;

  @ApiProperty({
    example: 0.3,
    description: 'Default commission split (0.0 to 1.0)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultSplit: number;
}
