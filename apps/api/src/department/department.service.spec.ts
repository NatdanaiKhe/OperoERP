import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DepartmentService } from './department.service';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let prisma: {
    department: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      department: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<DepartmentService>(DepartmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a department and returns the created record', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      const created = { id: 'dept-1', name: 'Engineering', companyId: 'company-1' };
      prisma.department.create.mockResolvedValue(created);

      const result = await service.create({ name: 'Engineering', companyId: 'company-1' });

      expect(prisma.department.findUnique).toHaveBeenCalledWith({
        where: { companyId_name: { companyId: 'company-1', name: 'Engineering' } },
      });
      expect(prisma.department.create).toHaveBeenCalledWith({
        data: { name: 'Engineering', companyId: 'company-1' },
      });
      expect(result).toEqual(created);
    });

    it('throws ConflictException when the name already exists in the company', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-x', name: 'Engineering', companyId: 'company-1' });

      await expect(
        service.create({ name: 'Engineering', companyId: 'company-1' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.department.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all departments when no companyId given', async () => {
      const departments = [{ id: 'dept-1', name: 'Engineering', companyId: 'company-1' }];
      prisma.department.findMany.mockResolvedValue(departments);

      const result = await service.findAll();

      expect(prisma.department.findMany).toHaveBeenCalledWith();
      expect(result).toEqual(departments);
    });

    it('filters by companyId when provided', async () => {
      const departments = [{ id: 'dept-1', name: 'Engineering', companyId: 'company-1' }];
      prisma.department.findMany.mockResolvedValue(departments);

      const result = await service.findAll('company-1');

      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
      });
      expect(result).toEqual(departments);
    });
  });

  describe('findOne', () => {
    it('returns the department for a valid id', async () => {
      const department = { id: 'dept-1', name: 'Engineering', companyId: 'company-1' };
      prisma.department.findUnique.mockResolvedValue(department);

      const result = await service.findOne('dept-1');

      expect(prisma.department.findUnique).toHaveBeenCalledWith({ where: { id: 'dept-1' } });
      expect(result).toEqual(department);
    });

    it('throws NotFoundException when the department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns the department', async () => {
      const existing = { id: 'dept-1', name: 'Engineering', companyId: 'company-1' };
      const updated = { id: 'dept-1', name: 'Eng', companyId: 'company-1' };
      prisma.department.findUnique.mockResolvedValue(existing);
      prisma.department.update.mockResolvedValue(updated);

      const result = await service.update('dept-1', { name: 'Eng' });

      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
        data: { name: 'Eng' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when the department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the department when it has no users', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1', name: 'Engineering', companyId: 'company-1' });
      prisma.user.count.mockResolvedValue(0);
      prisma.department.delete.mockResolvedValue({});

      await service.remove('dept-1');

      expect(prisma.user.count).toHaveBeenCalledWith({ where: { departmentId: 'dept-1' } });
      expect(prisma.department.delete).toHaveBeenCalledWith({ where: { id: 'dept-1' } });
    });

    it('throws NotFoundException when the department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the department still has users', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1', name: 'Engineering', companyId: 'company-1' });
      prisma.user.count.mockResolvedValue(3);
      await expect(service.remove('dept-1')).rejects.toThrow(ConflictException);
      expect(prisma.department.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignUser', () => {
    it('assigns a user to a department and returns the updated user', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1', name: 'Engineering', companyId: 'company-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', username: 'jack' });
      const updatedUser = { id: 'user-1', username: 'jack', departmentId: 'dept-1' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.assignUser('user-1', 'dept-1');

      expect(prisma.department.findUnique).toHaveBeenCalledWith({ where: { id: 'dept-1' } });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { departmentId: 'dept-1' },
      });
      expect(result).toEqual(updatedUser);
    });

    it('throws NotFoundException when the department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(service.assignUser('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1', name: 'Engineering', companyId: 'company-1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assignUser('missing-user', 'dept-1')).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
