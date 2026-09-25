import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import type { Request } from 'express';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    getMovementHistory: jest.Mock;
    adjustStock: jest.Mock;
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
      findAll: jest.fn(),
      findOne: jest.fn(),
      getMovementHistory: jest.fn(),
      adjustStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass the query to findAll', async () => {
    const query = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(query as any);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('should delegate findOne to the service', async () => {
    service.findOne.mockResolvedValue({ productId: 'p-1', quantity: 0 });

    await controller.findOne('p-1');

    expect(service.findOne).toHaveBeenCalledWith('p-1');
  });

  it('should delegate getMovementHistory to the service', async () => {
    service.getMovementHistory.mockResolvedValue({ data: [], meta: {} });

    await controller.getMovementHistory('p-1', { page: 1, limit: 10 } as any);

    expect(service.getMovementHistory).toHaveBeenCalledWith('p-1', {
      page: 1,
      limit: 10,
    });
  });

  it('should pass userId and req to adjustStock', async () => {
    const dto = { productId: 'p-1', type: 'RECEIPT', quantity: 10 };
    service.adjustStock.mockResolvedValue({ id: 'inv-1' });

    await controller.adjust(dto as any, mockUser, req);

    expect(service.adjustStock).toHaveBeenCalledWith(
      dto,
      mockUser.userId,
      req,
    );
  });
});
