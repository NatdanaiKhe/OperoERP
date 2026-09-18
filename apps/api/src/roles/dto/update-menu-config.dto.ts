import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class MenuItemDto {
  @ApiProperty({ example: 'dashboard' })
  @IsString()
  menuKey!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  visible!: boolean;
}

export class UpdateMenuConfigDto {
  @ApiProperty({ type: [MenuItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items!: MenuItemDto[];
}
