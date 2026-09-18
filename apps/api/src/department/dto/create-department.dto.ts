import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'company-uuid' })
  @IsString()
  companyId!: string;
}
