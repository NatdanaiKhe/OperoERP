import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
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

    const result = await service.create(product, companyId, userId);

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

  it('should get a product by id', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(product);

    const result = await service.findOne(productId, companyId);

    expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
      where: { id: productId, companyId },
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
    );

    expect(mockPrismaService.product.update).toHaveBeenCalledWith({
      where: { id: productId, companyId },
      data: updatedProduct,
    });
    expect(result).toEqual(updatedProduct);
  });

  it('should throw an error if product not found during update', async () => {
    mockPrismaService.product.update.mockRejectedValue(
      new Error('Product not found'),
    );

    await expect(
      service.update(productId, product, companyId, userId),
    ).rejects.toThrow(new NotFoundException(`Product not found`));
  });

  it('should soft delete a product', async () => {
    const deletedProduct = { ...product, deletedAt: new Date() };
    mockPrismaService.product.update.mockResolvedValue(deletedProduct);

    const result = await service.remove(productId, companyId, userId);

    expect(mockPrismaService.product.update).toHaveBeenCalledWith({
      where: { id: productId, companyId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toEqual(deletedProduct);
  });

  it('should throw an error if product not found during delete', async () => {
    mockPrismaService.product.update.mockRejectedValue(
      new Error('Product not found'),
    );

    await expect(service.remove(productId, companyId, userId)).rejects.toThrow(
      new NotFoundException(`Product not found`),
    );
  });
});
