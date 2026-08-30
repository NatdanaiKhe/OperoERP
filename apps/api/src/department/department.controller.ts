import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ReassignDepartmentDto } from './dto/reassign-department.dto';

@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.departmentService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }

  @Post(':id/users/:userId')
  @Roles('superadmin', 'admin')
  @HttpCode(200)
  assignUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.departmentService.assignUser(userId, id);
  }

  @Post(':id/reassign')
  @Roles('superadmin', 'admin')
  @HttpCode(200)
  reassignUsers(@Param('id') id: string, @Body() dto: ReassignDepartmentDto) {
    return this.departmentService.reassignUsers(id, dto.targetDepartmentId);
  }
}
