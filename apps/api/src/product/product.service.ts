import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsDto } from './dto/find-product.dto';
import { AuditAction, AuditLogService } from '@/audit/audit-log.service';
import { Request } from 'express';
import { Prisma } from 'database';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    dto: CreateProductDto,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    try {
      const product = await this.prisma.product.create({
        data: { ...dto, companyId },
      });

      await this.auditLog.log({
        action: AuditAction.PRODUCT_CREATED,
        userId: requestingUserId,
        req,
        metadata: { productId: product.id },
      });
      return product;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Product with this SKU already exists in this company',
        );
      }
      throw err;
    }
  }

  async findAll(
    companyId: string,
    { name, sku, categoryId, isActive, page = 1, limit = 10 }: FindProductsDto,
  ) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      name: name ? { contains: name, mode: 'insensitive' } : undefined,
      sku: sku ? { contains: sku, mode: 'insensitive' } : undefined,
      categoryId: categoryId ?? undefined,
      isActive: isActive ?? undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, baseUom: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    try {
      const product = await this.prisma.product.update({
        where: { id, companyId, deletedAt: null },
        data: dto,
      });

      await this.auditLog.log({
        action: AuditAction.PRODUCT_UPDATED,
        userId: requestingUserId,
        req,
        metadata: { productId: id },
      });
      return product;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Product not found');
      }
      throw err;
    }
  }

  async findAllCategory(companyId: string) {
    return this.prisma.productCategory.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async remove(
    id: string,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    try {
      const product = await this.prisma.product.update({
        where: { id, companyId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      await this.auditLog.log({
        action: AuditAction.PRODUCT_DELETED,
        userId: requestingUserId,
        req,
        metadata: { productId: id },
      });

      return product;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Product not found');
      }
      throw err;
    }
  }
}
