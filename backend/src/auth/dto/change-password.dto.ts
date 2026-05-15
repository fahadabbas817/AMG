import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentP@ssw0rd', description: 'The current password' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'NewP@ssw0rd123', description: 'The new password' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
