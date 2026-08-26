import { Module } from '@nestjs/common';
import { CompanyService } from '@/company/company.service';
import { CompanyController } from '@/company/company.controller';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
