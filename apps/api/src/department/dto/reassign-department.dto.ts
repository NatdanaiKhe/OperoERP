import { IsString, MinLength } from 'class-validator';

export class ReassignDepartmentDto {
  @IsString()
  @MinLength(1)
  targetDepartmentId!: string;
}
