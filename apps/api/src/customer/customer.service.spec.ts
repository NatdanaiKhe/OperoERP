import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from '@/customer/customer.service';
import { PrismaService } from '@/prisma/prisma.service';

const companyId = 'company-id';
const customerId = 'customer-id';
const customer = {
  id: customerId,
  name: 'Customer 1',
  email: 'customer1@example.com',
  taxId: '123456789',
  companyId: companyId,
  address: '123 Main St',
  phone: '123-456-7890',
  contactPerson: 'John Doe',
  notes: 'Some notes',
};

const customers = [
  customer,
  {
    id: 'customer-id-2',
    name: 'Customer 2',
    email: 'customer2@example.com',
    taxId: '987654321',
    companyId: companyId,
    address: '456 Elm St',
    phone: '987-654-3210',
    contactPerson: 'Jane Smith',
    notes: 'Some other notes',
  },
];

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: PrismaService;
  const mockPrismaService = {
    customer: {
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
        CustomerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a customer', async () => {
    mockPrismaService.customer.create.mockResolvedValue({
      ...customer,
      id: customerId,
    });

    const result = await service.create(customer, companyId);

    expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
      data: { ...customer, companyId },
    });
    expect(result).toEqual({ ...customer, id: customerId, companyId });
  });

  it('returns paginated customers with default params', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue(customers);
    mockPrismaService.customer.count.mockResolvedValue(2);

    const result = await service.findAll(companyId, {});

    expect(result.data).toEqual(customers);
    expect(result.meta).toEqual({
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it('scopes the query to the given companyId and excludes soft-deleted rows', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue([]);
    mockPrismaService.customer.count.mockResolvedValue(0);

    await service.findAll(companyId, {});

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
        }),
      }),
    );
  });

  it('applies email, name, and taxId filters with case-insensitive contains', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue([customers[0]]);
    mockPrismaService.customer.count.mockResolvedValue(1);

    await service.findAll(companyId, {
      email: 'john',
      name: 'John',
      taxId: '123',
    });

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { contains: 'john', mode: 'insensitive' },
          name: { contains: 'John', mode: 'insensitive' },
          taxId: { contains: '123', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('omits filters that are not provided', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue(customers);
    mockPrismaService.customer.count.mockResolvedValue(2);

    await service.findAll(companyId, {});

    const call = mockPrismaService.customer.findMany.mock.calls[0][0];
    expect(call.where.email).toBeUndefined();
    expect(call.where.name).toBeUndefined();
    expect(call.where.taxId).toBeUndefined();
  });

  it('calculates skip/take correctly for a given page and pageSize', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue([]);
    mockPrismaService.customer.count.mockResolvedValue(45);

    const result = await service.findAll(companyId, { page: 3, pageSize: 10 });

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (page - 1) * pageSize
        take: 10,
      }),
    );
    expect(result.meta).toEqual({
      total: 45,
      page: 3,
      pageSize: 10,
      totalPages: 5,
    });
  });

  it('applies sortBy and sortOrder', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue(customers);
    mockPrismaService.customer.count.mockResolvedValue(2);

    await service.findAll(companyId, { sortBy: 'name', sortOrder: 'asc' });

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('defaults to createdAt desc when no sort params given', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue(customers);
    mockPrismaService.customer.count.mockResolvedValue(2);

    await service.findAll(companyId, {});

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('returns empty data with correct meta when no customers match', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue([]);
    mockPrismaService.customer.count.mockResolvedValue(0);

    const result = await service.findAll(companyId, { name: 'nonexistent' });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('calls findMany and count concurrently (both invoked once each)', async () => {
    mockPrismaService.customer.findMany.mockResolvedValue(customers);
    mockPrismaService.customer.count.mockResolvedValue(2);

    await service.findAll(companyId, {});

    expect(mockPrismaService.customer.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.customer.count).toHaveBeenCalledTimes(1);
  });

  it('should find a customer by id', async () => {
    mockPrismaService.customer.findUnique.mockResolvedValue(customer);

    const result = await service.findOne(customerId);

    expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
      where: { id: customerId },
    });
    expect(result).toEqual(customer);
  });

  it('should update a customer', async () => {
    const updateCustomerDto = {
      name: 'Updated Customer',
      email: 'updated.customer@example.com',
    };

    mockPrismaService.customer.update.mockResolvedValue({
      ...customer,
      ...updateCustomerDto,
    });

    const result = await service.update(customerId, updateCustomerDto);

    expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
      where: { id: customerId },
      data: updateCustomerDto,
    });

    expect(result).toEqual({
      ...customer,
      ...updateCustomerDto,
    });
  });

  it('should soft delete a customer', async () => {
    mockPrismaService.customer.update.mockResolvedValue({
      ...customer,
      deletedAt: new Date(),
    });

    const result = await service.delete('customer-id');

    expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-id' },
      data: { deletedAt: expect.any(Date) },
    });

    expect(result).toEqual({
      ...customer,
      deletedAt: expect.any(Date),
    });
  });
});
