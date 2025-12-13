import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({ example: 'admin@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  password: string;
}

export class LoginVendorDto {
  @ApiProperty({ example: 'vendor@example.com', description: 'Vendor email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Vendor password' })
  password: string;

  @ApiProperty({ example: '001', description: 'Vendor ID' })
  @IsNotEmpty()
  vendorId: string;
}
