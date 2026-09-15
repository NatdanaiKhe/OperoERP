import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'database';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsDto } from './dto/find-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, companyId: string, userId: string) {
    return this.prisma.product.create({
      data: { ...dto, companyId },
    });
  }

  async findAll(
    companyId: string,
    { name, sku, page = 1, limit = 10 }: FindProductsDto,
  ) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      name: name ? { contains: name, mode: 'insensitive' } : undefined,
      sku: sku ? { contains: sku, mode: 'insensitive' } : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, companyId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    companyId: string,
    userId: string,
  ) {
    try {
      return await this.prisma.product.update({
        where: { id, companyId },
        data: dto,
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  async remove(id: string, companyId: string, userId: string) {
    try {
      return await this.prisma.product.update({
        where: { id, companyId },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }
}
