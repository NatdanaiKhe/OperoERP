import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination-dto';

export class QueryInventoryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by product name/SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Only return items at or below their reorderPoint',
  })
  @IsOptional()
  @IsBooleanString()
  lowStockOnly?: string;

  @ApiPropertyOptional({
    description: 'Filter by stock status',
    enum: ['in_stock', 'low', 'out_of_stock'],
  })
  @IsOptional()
  @IsIn(['in_stock', 'low', 'out_of_stock'])
  status?: 'in_stock' | 'low' | 'out_of_stock';
}
