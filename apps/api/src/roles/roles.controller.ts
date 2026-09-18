import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { UpdateMenuConfigDto } from './dto/update-menu-config.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Roles('superadmin', 'admin')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved' })
  async listRoles(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') queryCompanyId?: string,
  ) {
    return this.rolesService.listRoles({
      companyId: user.isSuperAdmin ? (queryCompanyId ?? null) : user.companyId,
      isSuperAdmin: user.isSuperAdmin,
    });
  }

  @Put(':id/menu-config')
  @Roles('superadmin', 'admin')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: 'Update role menu configuration' })
  @ApiResponse({ status: 200, description: 'Menu config updated' })
  async updateMenuConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMenuConfigDto,
  ) {
    return this.rolesService.updateMenuConfig(id, dto.items, {
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
    });
  }
}
