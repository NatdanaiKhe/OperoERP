import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CompanyService } from '@/company/company.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: {
    company: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      company: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a company and returns the created record', async () => {
      const created = { id: 'company-uuid-1', name: 'Acme' };
      prisma.company.create.mockResolvedValue(created);

      const result = await service.create({ name: 'Acme' });

      expect(prisma.company.create).toHaveBeenCalledWith({
        data: { name: 'Acme' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('returns all companies', async () => {
      const companies = [
        { id: 'company-uuid-1', name: 'Acme' },
        { id: 'company-uuid-2', name: 'Globex' },
      ];
      prisma.company.findMany.mockResolvedValue(companies);

      const result = await service.findAll();

      expect(prisma.company.findMany).toHaveBeenCalledWith();
      expect(result).toEqual(companies);
    });
  });

  describe('findOne', () => {
    it('returns the company for a valid id', async () => {
      const company = { id: 'company-uuid-1', name: 'Acme' };
      prisma.company.findUnique.mockResolvedValue(company);

      const result = await service.findOne('company-uuid-1');

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
      });
      expect(result).toEqual(company);
    });

    it('throws NotFoundException when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and returns the company', async () => {
      const existing = { id: 'company-uuid-1', name: 'Acme' };
      const updated = { id: 'company-uuid-1', name: 'Acme Corp' };
      prisma.company.findUnique.mockResolvedValue(existing);
      prisma.company.update.mockResolvedValue(updated);

      const result = await service.update('company-uuid-1', {
        name: 'Acme Corp',
      });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { name: 'Acme Corp' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the company', async () => {
      const existing = { id: 'company-uuid-1', name: 'Acme' };
      prisma.company.findUnique.mockResolvedValue(existing);
      prisma.company.delete.mockResolvedValue(existing);

      await service.remove('company-uuid-1');

      expect(prisma.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
      });
    });

    it('throws NotFoundException when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
