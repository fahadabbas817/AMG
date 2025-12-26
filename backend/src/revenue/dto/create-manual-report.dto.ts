import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from 'class-validator';

export class ManualRowDto {
  @ApiProperty({
    description: 'The Name of the Vendor (or raw text)',
    required: false,
  })
  @IsString()
  @IsOptional()
  vendorName: string;

  @ApiProperty({
    description: 'The UUID of the Vendor (if selected)',
    required: true,
  })
  @IsUUID()
  vendorId: string;

  @ApiProperty({ description: 'Gross Revenue amount for this vendor' })
  @IsNumber()
  grossRevenue: number;

  @ApiProperty({ description: 'Description or Title', required: false })
  @IsOptional()
  @IsString()
  lineItemName?: string;
}

export class CreateManualReportDto {
  @ApiProperty({ description: 'UUID of the Platform' })
  @IsUUID()
  platformId: string;

  @ApiProperty({ description: 'Report Month (YYYY-MM-DD)' })
  @IsDateString()
  month: string;

  @ApiProperty({ description: 'Total Check Amount (Control Total)' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ type: [ManualRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualRowDto)
  rows: ManualRowDto[];
}
