import { IsArray, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EmailType {
  CUSTOM = 'CUSTOM',
  WELCOME = 'WELCOME',
}

export class BroadcastEmailDto {
  @ApiProperty({ type: [String], description: 'List of Vendor IDs' })
  @IsArray()
  @IsString({ each: true })
  vendorIds: string[];

  @ApiProperty({ example: 'Important Update', description: 'Email Subject' })
  @IsString()
  subject: string;

  @ApiProperty({
    example: 'Hello {{name}}, ...',
    description: 'Email Body or Template Content',
  })
  @IsString()
  body: string;

  @ApiProperty({ enum: EmailType, default: EmailType.CUSTOM })
  @IsEnum(EmailType)
  @IsOptional()
  type?: EmailType;
}
