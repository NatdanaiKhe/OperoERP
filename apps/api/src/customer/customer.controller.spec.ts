import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from '@/customer/customer.controller';
import { CustomerService } from '@/customer/customer.service';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';

describe('CustomerController', () => {
  let controller: CustomerController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUser = {
    userId: 'user-1',
    roles: ['admin'],
    companyId: 'company-1',
    isSuperAdmin: false,
  } as JwtPayload;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [{ provide: CustomerService, useValue: service }],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass companyId to create', async () => {
    const createDto = { name: 'John Doe', email: 'john.doe@example.com' };
    service.create.mockResolvedValue({ id: '1', ...createDto });

    await controller.create(mockUser, createDto as any);

    expect(service.create).toHaveBeenCalledWith(createDto, mockUser.companyId);
  });

  it('should pass companyId to findAll', async () => {
    const filter = { name: 'John' };
    service.findAll.mockResolvedValue([]);

    await controller.findAll(mockUser, filter as any);

    expect(service.findAll).toHaveBeenCalledWith(mockUser.companyId, filter);
  });

  it('should pass companyId to findOne', async () => {
    service.findOne.mockResolvedValue({ id: '1' });

    await controller.findOne('1', mockUser);

    expect(service.findOne).toHaveBeenCalledWith('1', mockUser.companyId);
  });

  it('should pass companyId to update', async () => {
    const updateDto = { name: 'Updated Name' };
    service.update.mockResolvedValue({ id: '1', ...updateDto });

    await controller.update('1', updateDto as any, mockUser);

    expect(service.update).toHaveBeenCalledWith(
      '1',
      updateDto,
      mockUser.companyId,
    );
  });

  it('should pass companyId to delete', async () => {
    service.delete.mockResolvedValue({ id: '1' });

    await controller.delete('1', mockUser);

    expect(service.delete).toHaveBeenCalledWith('1', mockUser.companyId);
  });
});
