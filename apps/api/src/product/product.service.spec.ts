import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '@/audit/audit-log.service';

const companyId = 'company-id';
const productId = 'product-id';
const userId = 'user-id';
const product = {
  id: productId,
  name: 'Product 1',
  description: 'Description of Product 1',
  defaultSalesPrice: 100,
  defaultCost: 50,
  sku: 'SKU-001',
  barcode: 'BARCODE-001',
  categoryId: 'category-id',
  baseUomId: 'uom-id',
  companyId: companyId,
};

const products = [
  product,
  {
    id: 'product-id-2',
    name: 'Product 2',
    description: 'Description of Product 2',
    defaultSalesPrice: 200,
    defaultCost: 100,
    sku: 'SKU-002',
    barcode: 'BARCODE-002',
    categoryId: 'category-id-2',
    baseUomId: 'uom-id',
    companyId: companyId,
  },
];

const req = {} as Request;

describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaService;
  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    productCategory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a product', async () => {
    mockPrismaService.product.create.mockResolvedValue({
      ...product,
      id: productId,
    });

    const result = await service.create(product, companyId, userId, req);

    expect(mockPrismaService.product.create).toHaveBeenCalledWith({
      data: { ...product, companyId },
    });
    expect(result).toEqual({ ...product, id: productId, companyId });
  });

  it('get all products with default params', async () => {
    mockPrismaService.product.findMany.mockResolvedValue(products);
    mockPrismaService.product.count.mockResolvedValue(2);

    const result = await service.findAll(companyId, {});

    expect(result.data).toEqual(products);
    expect(result.meta).toEqual({
      total: 2,
      page: 1,
      limit: 10,
    });
  });

  it('get all products applies categoryId and isActive filters and includes relations', async () => {
    mockPrismaService.product.findMany.mockResolvedValue([]);
    mockPrismaService.product.count.mockResolvedValue(0);

    await service.findAll(companyId, {
      categoryId: 'category-id',
      isActive: false,
    });

    expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          categoryId: 'category-id',
          isActive: false,
        }),
        include: { category: true, baseUom: true },
      }),
    );
  });

  it('get all categories scoped to company, non-deleted, ordered by name', async () => {
    const categories = [{ id: 'category-id', name: 'Accessories', companyId }];
    mockPrismaService.productCategory.findMany.mockResolvedValue(categories);

    const result = await service.findAllCategory(companyId);

    expect(mockPrismaService.productCategory.findMany).toHaveBeenCalledWith({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual(categories);
  });

  it('should get a product by id', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(product);

    const result = await service.findOne(productId, companyId);

    expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
      where: { id: productId, companyId, deletedAt: null },
    });
    expect(result).toEqual(product);
  });

  it('should throw an error if product not found', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne(productId, companyId)).rejects.toThrow(
      new NotFoundException(`Product not found`),
    );
  });

  it('should update a product', async () => {
    const updatedProduct = { ...product, name: 'Updated Product' };
    mockPrismaService.product.update.mockResolvedValue(updatedProduct);

    const result = await service.update(
      productId,
      updatedProduct,
      companyId,
      userId,
      req,
    );

    expect(mockPrismaService.product.update).toHaveBeenCalledWith({
      where: { id: productId, companyId, deletedAt: null },
      data: updatedProduct,
    });
    expect(result).toEqual(updatedProduct);
  });

  it('should throw an error if product not found during update', async () => {
    mockPrismaService.product.update.mockRejectedValue(
      new NotFoundException('Product not found'),
    );

    await expect(
      service.update(productId, product, companyId, userId, req),
    ).rejects.toThrow(new NotFoundException(`Product not found`));
  });

  it('should soft delete a product', async () => {
    const deletedProduct = { ...product, deletedAt: new Date() };
    mockPrismaService.product.update.mockResolvedValue(deletedProduct);

    const result = await service.remove(productId, companyId, userId, req);

    expect(mockPrismaService.product.update).toHaveBeenCalledWith({
      where: { id: productId, companyId, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toEqual(deletedProduct);
  });

  it('should throw an error if product not found during delete', async () => {
    mockPrismaService.product.update.mockRejectedValue(
      new NotFoundException('Product not found'),
    );

    await expect(
      service.remove(productId, companyId, userId, req),
    ).rejects.toThrow(new NotFoundException(`Product not found`));
  });
});
