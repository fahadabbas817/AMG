import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abcdef123456',
    description: 'The reset token received via email',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'vendor@example.com', description: 'Vendor email' })
  @IsString()
  email: string;

  @ApiProperty({
    example: 'NewStrongPassword123!',
    description: 'The new password',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
