import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class MenuItemDto {
  @IsString()
  menuKey!: string;

  @IsBoolean()
  visible!: boolean;
}

export class UpdateMenuConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items!: MenuItemDto[];
}
