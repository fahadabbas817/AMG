import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePayoutDto {
  @ApiProperty({ description: 'UUID of the Vendor' })
  @IsUUID()
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
