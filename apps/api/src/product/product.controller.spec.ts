import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import type { Request } from 'express';

describe('ProductController', () => {
  let controller: ProductController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findAllCategory: jest.Mock;
    findAllUom: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
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
      findAllCategory: jest.fn(),
      findAllUom: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: service }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass companyId and userId to create', async () => {
    const dto = { name: 'Widget', baseUomId: 'uom-1' };
    service.create.mockResolvedValue({ id: '1', ...dto });

    await controller.create(mockUser, dto as never, req);

    expect(service.create).toHaveBeenCalledWith(
      dto,
      mockUser.companyId,
      mockUser.userId,
      req,
    );
  });

  it('should pass the filter to findAll', async () => {
    const filter = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(filter as never);

    expect(service.findAll).toHaveBeenCalledWith(filter);
  });

  it('should delegate findOne to the service', async () => {
    service.findOne.mockResolvedValue({ id: '1' });

    await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('should delegate findAllCategory to the service', async () => {
    service.findAllCategory.mockResolvedValue([]);

    await controller.findAllCategory();

    expect(service.findAllCategory).toHaveBeenCalledWith();
  });

  it('should delegate findAllUom to the service', async () => {
    service.findAllUom.mockResolvedValue([]);

    await controller.findAllUom();

    expect(service.findAllUom).toHaveBeenCalledWith();
  });

  it('should pass userId to update', async () => {
    const dto = { name: 'Widget v2' };
    service.update.mockResolvedValue({ id: '1', ...dto });

    await controller.update('1', dto as never, mockUser, req);

    expect(service.update).toHaveBeenCalledWith('1', dto, mockUser.userId, req);
  });

  it('should pass userId to remove', async () => {
    service.remove.mockResolvedValue({ id: '1' });

    await controller.remove('1', mockUser, req);

    expect(service.remove).toHaveBeenCalledWith('1', mockUser.userId, req);
  });
});
