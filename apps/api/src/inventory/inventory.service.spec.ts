import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLogService, AuditAction } from '@/audit/audit-log.service';
import { getTenantContext } from '@/prisma/tenant-context';
import {
  CreateStockAdjustmentDto,
  ManualStockMovementType,
} from './dto/create-stock-adjustment.dto';

jest.mock('@/prisma/tenant-context');

const companyId = 'company-id';
const productId = 'product-id';
const userId = 'user-id';

const receiptDto: CreateStockAdjustmentDto = {
  productId,
  type: ManualStockMovementType.RECEIPT,
  quantity: 10,
  reason: 'buy',
};

const stockableProduct = {
  id: productId,
  companyId,
  name: 'Widget',
  type: 'STOCKABLE',
  sku: 'SKU-001',
};

describe('InventoryService', () => {
  let service: InventoryService;

  // The shape passed into $transaction's callback — mocks the model
  // delegates the real method actually calls: tx.inventoryItem, tx.stockMovement
  const mockTx = {
    inventoryItem: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
  };

  const mockAuditLog = { log: jest.fn() };

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockTx)),
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);

    (getTenantContext as jest.Mock).mockReturnValue({ companyId });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('adjustStock', () => {
    it('creates an InventoryItem row and logs a RECEIPT movement when none exists yet', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(stockableProduct);
      mockTx.inventoryItem.findUnique.mockResolvedValue(null);
      mockTx.inventoryItem.upsert.mockResolvedValue({
        id: 'inv-item-id',
        companyId,
        productId,
        quantity: 10,
      });

      const result = await service.adjustStock(receiptDto, userId);

      expect(mockTx.inventoryItem.upsert).toHaveBeenCalledWith({
        where: { companyId_productId: { companyId, productId } },
        create: { companyId, productId, quantity: 10 },
        update: { quantity: 10 },
      });
      expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId,
          productId,
          type: ManualStockMovementType.RECEIPT,
          quantity: 10,
          createdById: userId,
        }),
      });
      expect(result.quantity).toBe(10);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.STOCK_ADJUSTED }),
      );
    });

    it('rejects an adjustment that would drive stock negative', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(stockableProduct);
      mockTx.inventoryItem.findUnique.mockResolvedValue({
        quantity: 5,
      });

      await expect(
        service.adjustStock(
          {
            productId,
            type: ManualStockMovementType.WRITE_OFF,
            quantity: -10,
            reason: 'damaged',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.stockMovement.create).not.toHaveBeenCalled();
      expect(mockAuditLog.log).not.toHaveBeenCalled();
    });

    it('rejects adjustment for a non-stockable product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        ...stockableProduct,
        type: 'SERVICE',
      });

      await expect(service.adjustStock(receiptDto, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditLog.log).not.toHaveBeenCalled();
    });

    it('rejects adjustment for a missing product with 404', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.adjustStock(receiptDto, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns quantity 0 when no InventoryItem row exists', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(stockableProduct);
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue(null);

      const result = await service.findOne(productId);

      expect(result).toMatchObject({
        id: null,
        productId,
        productName: 'Widget',
        quantity: 0,
        reorderPoint: null,
        isLowStock: false,
      });
    });

    it('returns 404 for a missing product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne(productId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns 400 for a non-stockable product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        ...stockableProduct,
        type: 'NON_STOCK',
      });

      await expect(service.findOne(productId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('lists stockable products with zero-fill for missing rows', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { ...stockableProduct, inventoryItems: [] },
      ]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: null,
        quantity: 0,
        isLowStock: false,
      });
      expect(result.meta.total).toBe(1);
    });

    it('filters lowStockOnly to items at or below reorderPoint', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          ...stockableProduct,
          inventoryItems: [{ id: 'inv-1', quantity: 3, reorderPoint: 5 }],
        },
        {
          ...stockableProduct,
          id: 'p-2',
          inventoryItems: [],
        },
      ]);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        lowStockOnly: 'true',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(3);
      expect(result.data[0].isLowStock).toBe(true);
      expect(result.data[0].sku).toBe('SKU-001');
    });

    it('filters status=out_of_stock to items with zero quantity', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          ...stockableProduct,
          inventoryItems: [{ id: 'inv-1', quantity: 0, reorderPoint: 5 }],
        },
        {
          ...stockableProduct,
          id: 'p-2',
          inventoryItems: [{ id: 'inv-2', quantity: 10, reorderPoint: 5 }],
        },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: 'out_of_stock',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(0);
      expect(result.meta.total).toBe(1);
    });

    it('filters status=in_stock to non-low items with positive quantity', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          ...stockableProduct,
          inventoryItems: [{ id: 'inv-1', quantity: 10, reorderPoint: 5 }],
        },
        {
          ...stockableProduct,
          id: 'p-2',
          inventoryItems: [{ id: 'inv-2', quantity: 3, reorderPoint: 5 }],
        },
        {
          ...stockableProduct,
          id: 'p-3',
          inventoryItems: [],
        },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: 'in_stock',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(10);
      expect(result.data[0].isLowStock).toBe(false);
    });

    it('filters status=low identically to lowStockOnly', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          ...stockableProduct,
          inventoryItems: [{ id: 'inv-1', quantity: 3, reorderPoint: 5 }],
        },
        {
          ...stockableProduct,
          id: 'p-2',
          inventoryItems: [{ id: 'inv-2', quantity: 10, reorderPoint: 5 }],
        },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: 'low',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(3);
      expect(result.data[0].isLowStock).toBe(true);
    });
  });

  describe('getMovementHistory', () => {
    it('returns paginated movements newest first', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(stockableProduct);
      mockPrismaService.stockMovement.findMany.mockResolvedValue([
        { id: 'm-1', productId, quantity: 5 },
      ]);
      mockPrismaService.stockMovement.count.mockResolvedValue(1);

      const result = await service.getMovementHistory(productId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10 });
      expect(mockPrismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns 400 for a non-stockable product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        ...stockableProduct,
        type: 'SERVICE',
      });

      await expect(
        service.getMovementHistory(productId, { page: 1, limit: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
