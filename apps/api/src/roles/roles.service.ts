import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async listRoles(requestingUser: {
    companyId: string | null;
    isSuperAdmin: boolean;
  }) {
    const { companyId, isSuperAdmin } = requestingUser;

    if (!isSuperAdmin && !companyId) {
      return []; // no company context, nothing to show
    }

    return this.prisma.role.findMany({
      where: isSuperAdmin && !companyId ? {} : { companyId: companyId! },
      select: {
        id: true,
        name: true,
        description: true,
        companyId: true,
        menuVisibility: {
          select: { id: true, menuKey: true, visible: true },
          orderBy: { menuKey: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateMenuConfig(
    roleId: string,
    items: { menuKey: string; visible: boolean }[],
    requester: { companyId: string | null; isSuperAdmin: boolean },
  ) {
    // Scope check: admins may only edit roles in their own company.
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { companyId: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (
      !requester.isSuperAdmin &&
      role.companyId !== requester.companyId
    ) {
      throw new ForbiddenException('Insufficient role');
    }

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
