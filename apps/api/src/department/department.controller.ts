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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ReassignDepartmentDto } from './dto/reassign-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @RequirePermissions('department:create')
  @ApiOperation({ summary: 'Create a department' })
  @ApiResponse({ status: 201, description: 'Department created' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  @RequirePermissions('department:read')
  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, description: 'Departments retrieved' })
  findAll(@Query('companyId') companyId?: string) {
    return this.departmentService.findAll(companyId);
  }

  @Get(':id')
  @RequirePermissions('department:read')
  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiResponse({ status: 200, description: 'Department retrieved' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @RequirePermissions('department:update')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, description: 'Department updated' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  @RequirePermissions('department:delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a department' })
  @ApiResponse({ status: 204, description: 'Department deleted' })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }

  @Post(':id/users/:userId')
  @Roles('superadmin', 'admin')
  @RequirePermissions('department:update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assign a user to a department' })
  @ApiResponse({ status: 200, description: 'User assigned' })
  assignUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.departmentService.assignUser(userId, id);
  }

  @Post(':id/reassign')
  @Roles('superadmin', 'admin')
  @RequirePermissions('department:update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reassign users to another department' })
  @ApiResponse({ status: 200, description: 'Users reassigned' })
  reassignUsers(@Param('id') id: string, @Body() dto: ReassignDepartmentDto) {
    return this.departmentService.reassignUsers(id, dto.targetDepartmentId);
  }
}
