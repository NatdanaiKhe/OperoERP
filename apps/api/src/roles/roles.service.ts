import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        menuVisibility: {
          select: { id: true, menuKey: true, visible: true },
          orderBy: { menuKey: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return roles;
  }

  async updateMenuConfig(
    roleId: string,
    items: { menuKey: string; visible: boolean }[],
  ) {
    // Upsert each menu visibility entry.
    for (const item of items) {
      await this.prisma.menuVisibility.upsert({
        where: {
          roleId_menuKey: { roleId, menuKey: item.menuKey },
        },
        update: { visible: item.visible },
        create: { roleId, menuKey: item.menuKey, visible: item.visible },
      });
    }
    // Return the updated role.
    return this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        menuVisibility: {
          select: { id: true, menuKey: true, visible: true },
          orderBy: { menuKey: 'asc' },
        },
      },
    });
  }
}
