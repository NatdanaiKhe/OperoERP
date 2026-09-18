import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReassignDepartmentDto {
  @ApiProperty({ example: 'target-dept-uuid' })
  @IsString()
  @MinLength(1)
  targetDepartmentId!: string;
}
