import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PRODUCT_TYPES = ['STOCKABLE', 'SERVICE', 'NON_STOCK'] as const;
export const TRACKING_MODES = ['NONE', 'LOT', 'SERIAL'] as const;

export class CreateProductDto {
  @ApiProperty({ example: 'Widget A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'uom-uuid' })
  @IsString()
  @IsNotEmpty()
  baseUomId!: string;

  @ApiPropertyOptional({ example: 'A standard widget' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'WDG-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 'cat-uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_TYPES, example: 'STOCKABLE' })
  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  type?: (typeof PRODUCT_TYPES)[number];

  @ApiPropertyOptional({ enum: TRACKING_MODES, example: 'NONE' })
  @IsOptional()
  @IsIn(TRACKING_MODES)
  trackingMode?: (typeof TRACKING_MODES)[number];

  @ApiPropertyOptional({ example: 29.99, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultSalesPrice?: number;

  @ApiPropertyOptional({ example: 15.0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultCost?: number;

  @ApiPropertyOptional({ example: 7.5, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  defaultTaxRate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
