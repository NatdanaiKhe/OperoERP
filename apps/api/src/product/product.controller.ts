import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsDto } from './dto/find-product.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import type { Request } from 'express';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
    @Req() req: Request,
  ) {
    return this.productService.create(dto, user.companyId, user.userId, req);
  }

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  findAll(@Query() filter: FindProductsDto) {
    return this.productService.findAll(filter);
  }

  @Get('category')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List all product categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  findAllCategory() {
    return this.productService.findAllCategory();
  }

  @Get('uom')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List all units of measure' })
  @ApiResponse({ status: 200, description: 'Units of measure retrieved' })
  findAllUom() {
    return this.productService.findAllUom();
  }

  @Get(':id')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.productService.update(id, dto, user.userId, req);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.productService.remove(id, user.userId, req);
  }
}
