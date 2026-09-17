import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from '@/customer/customer.controller';
import { CustomerService } from '@/customer/customer.service';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import type { Request } from 'express';

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

  const req = {} as Request;

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

    await controller.create(mockUser, createDto as any, req as any);

    expect(service.create).toHaveBeenCalledWith(
      createDto,
      mockUser.companyId,
      mockUser.userId,
      req,
    );
  });

  it('should pass the filter to findAll', async () => {
    const filter = { name: 'John' };
    service.findAll.mockResolvedValue([]);

    await controller.findAll(filter as any);

    expect(service.findAll).toHaveBeenCalledWith(filter);
  });

  it('should delegate findOne to the service', async () => {
    service.findOne.mockResolvedValue({ id: '1' });

    await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('should pass userId to update', async () => {
    const updateDto = { name: 'Updated Name' };
    service.update.mockResolvedValue({ id: '1', ...updateDto });

    await controller.update('1', updateDto as any, mockUser, req as any);

    expect(service.update).toHaveBeenCalledWith(
      '1',
      updateDto,
      mockUser.userId,
      req,
    );
  });

  it('should pass userId to delete', async () => {
    service.delete.mockResolvedValue({ id: '1' });

    await controller.delete('1', mockUser, req as any);

    expect(service.delete).toHaveBeenCalledWith('1', mockUser.userId, req);
  });
});
