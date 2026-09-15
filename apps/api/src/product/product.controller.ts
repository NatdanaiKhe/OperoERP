import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsDto } from './dto/find-product.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('product:create')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productService.create(dto, user.companyId, user.userId);
  }

  @Get()
  @RequirePermissions('product:read')
  findAll(@CurrentUser() user: JwtPayload, @Query() filter: FindProductsDto) {
    return this.productService.findAll(user.companyId, filter);
  }

  @Get(':id')
  @RequirePermissions('product:read')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @RequirePermissions('product:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productService.update(id, dto, user.companyId, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productService.remove(id, user.companyId, user.userId);
  }
}
