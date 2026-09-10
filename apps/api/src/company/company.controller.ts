import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CompanyService } from '@/company/company.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CreateCompanyDto } from '@/company/dto/create-company.dto';
import { UpdateCompanyDto } from '@/company/dto/update-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles('superadmin')
  @RequirePermissions('company:create')
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  @RequirePermissions('company:read')
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  @RequirePermissions('company:read')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @RequirePermissions('company:update')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @RequirePermissions('company:delete')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }
}
