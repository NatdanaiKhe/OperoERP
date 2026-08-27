import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RolesService } from './roles.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { UpdateMenuConfigDto } from './dto/update-menu-config.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Roles('superadmin', 'admin')
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
  @Roles('superadmin')
  async updateMenuConfig(
    @Param('id') id: string,
    @Body() dto: UpdateMenuConfigDto,
    @Req() _req: Request,
  ) {
    return this.rolesService.updateMenuConfig(id, dto.items);
  }
}
