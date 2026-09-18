import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
