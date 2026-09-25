import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { PaginationDto } from './dto/pagination-dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import type { Request } from 'express';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List current stock for stockable products' })
  @ApiResponse({ status: 200, description: 'Stock retrieved' })
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('product/:productId')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get current stock for a product' })
  @ApiResponse({ status: 200, description: 'Stock retrieved' })
  findOne(@Param('productId') productId: string) {
    return this.inventoryService.findOne(productId);
  }

  @Get('product/:productId/movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get stock movement history for a product' })
  @ApiResponse({ status: 200, description: 'Movements retrieved' })
  getMovementHistory(
    @Param('productId') productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.inventoryService.getMovementHistory(productId, pagination);
  }

  @Post('adjust')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Adjust stock for a product' })
  @ApiResponse({ status: 201, description: 'Stock adjusted' })
  adjust(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.inventoryService.adjustStock(dto, user.userId, req);
  }
}
