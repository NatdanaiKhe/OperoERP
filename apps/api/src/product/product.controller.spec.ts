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

  it('should pass companyId and filter to findAll', async () => {
    const filter = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(mockUser, filter as never);

    expect(service.findAll).toHaveBeenCalledWith(mockUser.companyId, filter);
  });

  it('should pass companyId to findOne', async () => {
    service.findOne.mockResolvedValue({ id: '1' });

    await controller.findOne('1', mockUser);

    expect(service.findOne).toHaveBeenCalledWith('1', mockUser.companyId);
  });

  it('should pass companyId to findAllCategory', async () => {
    service.findAllCategory.mockResolvedValue([]);

    await controller.findAllCategory(mockUser);

    expect(service.findAllCategory).toHaveBeenCalledWith(mockUser.companyId);
  });

  it('should pass companyId and userId to update', async () => {
    const dto = { name: 'Widget v2' };
    service.update.mockResolvedValue({ id: '1', ...dto });

    await controller.update('1', dto as never, mockUser, req);

    expect(service.update).toHaveBeenCalledWith(
      '1',
      dto,
      mockUser.companyId,
      mockUser.userId,
      req,
    );
  });

  it('should pass companyId and userId to remove', async () => {
    service.remove.mockResolvedValue({ id: '1' });

    await controller.remove('1', mockUser, req);

    expect(service.remove).toHaveBeenCalledWith(
      '1',
      mockUser.companyId,
      mockUser.userId,
      req,
    );
  });
});
