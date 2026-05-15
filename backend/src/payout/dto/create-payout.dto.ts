import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID, IsString } from 'class-validator';

export class CreatePayoutDto {
  @ApiProperty({ description: 'UUID of the Vendor' })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({
    description: 'List of RevenueRecord IDs to include in this payout',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  recordIds: string[];
}
