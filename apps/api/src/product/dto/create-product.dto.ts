import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PRODUCT_TYPES = ['STOCKABLE', 'SERVICE', 'NON_STOCK'] as const;
export const TRACKING_MODES = ['NONE', 'LOT', 'SERIAL'] as const;

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  baseUomId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  type?: (typeof PRODUCT_TYPES)[number];

  @IsOptional()
  @IsIn(TRACKING_MODES)
  trackingMode?: (typeof TRACKING_MODES)[number];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultSalesPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultTaxRate?: number;

  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
