import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RolesService } from './roles.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { UpdateMenuConfigDto } from './dto/update-menu-config.dto';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Roles('superadmin')
  async listRoles() {
    return this.rolesService.listRoles();
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
