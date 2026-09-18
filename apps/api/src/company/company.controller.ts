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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CompanyService } from '@/company/company.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CreateCompanyDto } from '@/company/dto/create-company.dto';
import { UpdateCompanyDto } from '@/company/dto/update-company.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles('superadmin')
  @RequirePermissions('company:create')
  @ApiOperation({ summary: 'Create a company' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  @RequirePermissions('company:read')
  @ApiOperation({ summary: 'List all companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved' })
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  @RequirePermissions('company:read')
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @RequirePermissions('company:update')
  @ApiOperation({ summary: 'Update a company' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @RequirePermissions('company:delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiResponse({ status: 204, description: 'Company deleted' })
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }
}
