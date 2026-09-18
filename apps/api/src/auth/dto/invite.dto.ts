import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InviteDto {
  @ApiProperty({ example: 'John', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'dept-uuid-here' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  departmentId!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role!: string;
}
