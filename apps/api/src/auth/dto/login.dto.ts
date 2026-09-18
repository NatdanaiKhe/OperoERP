import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @MinLength(1)
  password!: string;
}
