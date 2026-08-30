import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role?: string;
}
