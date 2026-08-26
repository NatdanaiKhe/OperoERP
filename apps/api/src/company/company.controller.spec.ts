import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from '@/company/company.controller';
import { CompanyService } from '@/company/company.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
