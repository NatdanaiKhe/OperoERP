import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from 'database';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditAction, AuditLogService } from '@/audit/audit-log.service';
import { getTenantContext } from '@/prisma/tenant-context';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { InventoryItemResponseDto } from './dto/inventory-item-response.dto';
import { PaginationDto } from './dto/pagination-dto';
import type {
  InventoryItemModel,
  ProductModel,
  StockMovementModel,
} from 'database';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  private toResponse(
    product: Pick<ProductModel, 'id' | 'name' | 'sku'>,
    item?: InventoryItemModel | null,
  ): InventoryItemResponseDto {
    const quantity = Number(item?.quantity ?? 0);
    const reorderPoint = item?.reorderPoint ? Number(item.reorderPoint) : null;
    return {
      id: item?.id ?? null,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      reorderPoint,
      isLowStock: reorderPoint !== null && quantity <= reorderPoint,
    };
  }

  async findAll({
    search,
    lowStockOnly,
    status,
    page = 1,
    limit = 10,
  }: QueryInventoryDto): Promise<{
    data: InventoryItemResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const where: Prisma.ProductWhereInput = {
      type: 'STOCKABLE',
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const needsMaterialize =
      lowStockOnly === 'true' ||
      status === 'low' ||
      status === 'out_of_stock' ||
      status === 'in_stock';

    if (needsMaterialize) {
      // Quantity lives on InventoryItem, so we have to materialize and filter
      // in JS before slicing. The list cap (limit <= 100) keeps this cheap.
      const products = await this.prisma.product.findMany({
        where,
        include: { inventoryItems: true },
        orderBy: { name: 'asc' },
      });
      let data = products.map((p) =>
        this.toResponse(p, p.inventoryItems[0] ?? null),
      );

      if (lowStockOnly === 'true' || status === 'low') {
        data = data.filter((d) => d.isLowStock);
      } else if (status === 'out_of_stock') {
        data = data.filter((d) => d.quantity === 0);
      } else if (status === 'in_stock') {
        data = data.filter((d) => d.quantity > 0 && !d.isLowStock);
      }

      const total = data.length;
      const skip = (page - 1) * limit;
      return {
        data: data.slice(skip, skip + limit),
        meta: { total, page, limit },
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { inventoryItems: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = products.map((p) =>
      this.toResponse(p, p.inventoryItems[0] ?? null),
    );

    return { data, meta: { total, page, limit } };
  }

  async findOne(productId: string): Promise<InventoryItemResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.type !== 'STOCKABLE') {
      throw new BadRequestException('Product is not stockable');
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { productId },
    });

    return this.toResponse(product, item);
  }

  async getMovementHistory(
    productId: string,
    { page = 1, limit = 10 }: PaginationDto,
  ): Promise<{
    data: StockMovementModel[];
    meta: { total: number; page: number; limit: number };
  }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.type !== 'STOCKABLE') {
      throw new BadRequestException('Product is not stockable');
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.stockMovement.count({ where: { productId } }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async adjustStock(
    dto: CreateStockAdjustmentDto,
    requestingUserId: string,
    req?: Request,
  ): Promise<InventoryItemResponseDto> {
    const companyId = getTenantContext()?.companyId;
    if (!companyId) {
      throw new BadRequestException('No active tenant context');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.type !== 'STOCKABLE') {
      throw new BadRequestException('Product is not stockable');
    }

    const inventoryItem = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: { companyId_productId: { companyId, productId: dto.productId } },
      });

      const currentQty = Number(existing?.quantity ?? 0);
      const newQty = currentQty + dto.quantity;

      if (newQty < 0) {
        throw new BadRequestException(
          `Adjustment would result in negative stock (${currentQty} + ${dto.quantity} = ${newQty})`,
        );
      }

      const item = await tx.inventoryItem.upsert({
        where: { companyId_productId: { companyId, productId: dto.productId } },
        create: { companyId, productId: dto.productId, quantity: dto.quantity },
        update: { quantity: newQty },
      });

      await tx.stockMovement.create({
        data: {
          companyId,
          productId: dto.productId,
          inventoryItemId: item.id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          createdById: requestingUserId,
        },
      });

      return item;
    });

    await this.auditLog.log({
      action: AuditAction.STOCK_ADJUSTED,
      userId: requestingUserId,
      req,
      metadata: {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        inventoryItemId: inventoryItem.id,
      },
    });

    return this.toResponse(product, inventoryItem);
  }

  async checkAndDeductStock(
    _tx: Prisma.TransactionClient,
    _items: { productId: string; quantity: number }[],
    _referenceId: string,
    _userId: string,
  ): Promise<void> {
    // Sales order fulfillment placeholder.
  }

  async reverseStockForOrder(
    _tx: Prisma.TransactionClient,
    _referenceId: string,
    _userId: string,
  ): Promise<void> {
    // Sales order cancellation placeholder.
  }
}
