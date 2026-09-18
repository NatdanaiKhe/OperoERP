import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'dept-uuid-here' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  departmentId?: string;

  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role?: string;
}
