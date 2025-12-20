import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class AddSplitDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the platform',
  })
  @IsUUID()
  @IsNotEmpty()
  platformId: string;

  @ApiProperty({
    example: 0.3,
    description: 'Default commission split (0.0 to 1.0)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;
}
