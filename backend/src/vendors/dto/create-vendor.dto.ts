import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PayoutMethod } from '../../../prisma/generated/enums';

export class BankDetailsDto {
  @ApiProperty({ example: 'Global Bank', description: 'Name of the bank' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: '1234567890', description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiPropertyOptional({
    example: '456 Finance St, New York, NY',
    description: 'Address of the bank',
  })
  @IsString()
  @IsOptional()
  bankAddress?: string;

  @ApiPropertyOptional({
    example: 'US123456789',
    description: 'IBAN or Routing number',
  })
  @IsString()
  @IsOptional()
  ibanRouting?: string;

  @ApiPropertyOptional({ example: 'GLOBALUS33', description: 'SWIFT/BIC code' })
  @IsString()
  @IsOptional()
  swiftCode?: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code (e.g., USD, EUR)',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    example: 'PAYPAL',
    enum: PayoutMethod,
    description: 'Method of payout',
  })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;

  @ApiPropertyOptional({
    example: 'vendor@example.com',
    description: 'PayPal email address if payout method is PAYPAL',
  })
  @ValidateIf((o) => o.payoutMethod === PayoutMethod.PAYPAL)
  @IsEmail()
  @IsNotEmpty()
  paypalEmail?: string;

  @ApiPropertyOptional({
    example: 'Checking',
    description: 'Type of bank account',
  })
  @IsString()
  @IsOptional()
  accountType?: string;
}

export class CreateVendorDto {
  @ApiProperty({
    example: 'Tech Solutions Inc',
    description: 'Legal company name',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'John Doe', description: 'Primary contact person' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({
    example: 'john@techsolutions.com',
    description: 'Email address for the vendor',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'VEND-001', description: 'Unique vendor identifier' })
  @IsString()
  @IsNotEmpty()
  vendorNumber: string;

  @ApiPropertyOptional({
    example: 'SecurePassword123!',
    description: 'Password for the vendor account',
  })
  @IsString()
  @IsOptional()
  password?: string; // Optional if we generate it or set it later

  @ApiPropertyOptional({
    example: '+1-555-0199',
    description: 'Contact phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: '123 Innovation Dr, Tech City',
    description: 'Physical address',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: 'Jane Smith',
    description: 'Name of the contract signatory',
  })
  @IsString()
  @IsOptional()
  contractSignatory?: string;

  @ApiPropertyOptional({
    example: ['VIP', 'Urgent'],
    description: 'List of tags/labels for the vendor',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subLabels: string[] = [];

  @ApiPropertyOptional({
    example: ['uuid-platform-1', 'uuid-platform-2'],
    description: 'List of Platform IDs for this vendor',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platformIds?: string[];

  @ApiPropertyOptional({
    type: BankDetailsDto,
    description: 'Banking and payout details',
  })
  @ValidateNested()
  @Type(() => BankDetailsDto)
  @IsOptional()
  bankDetails?: BankDetailsDto;
}
