import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { name: string; companyId: string }) {
    const existing = await this.prisma.department.findUnique({
      where: { companyId_name: { companyId: dto.companyId, name: dto.name } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Department name already exists in this company');
    }
    // Recreate a soft-deleted department with the same name by restoring it —
    // keeps the (companyId, name) unique constraint intact.
    if (existing) {
      return this.prisma.department.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
    }
    return this.prisma.department.create({
      data: { name: dto.name, companyId: dto.companyId },
    });
  }

  async findAll(companyId?: string) {
    if (companyId) {
      return this.prisma.department.findMany({
        where: { companyId, deletedAt: null },
      });
    }
    return this.prisma.department.findMany({ where: { deletedAt: null } });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department || department.deletedAt) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(id: string, dto: { name?: string }) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: { name: dto.name } });
  }

  // Soft delete. Only blocked while active (non-deleted) users are assigned;
  // the conflict response carries the count so the UI can offer reassignment.
  async remove(id: string) {
    await this.findOne(id);
    const activeUserCount = await this.prisma.user.count({
      where: { departmentId: id, deletedAt: null },
    });
    if (activeUserCount > 0) {
      throw new ConflictException({
        message: `Department has ${activeUserCount} active user(s) assigned; reassign them first`,
        affectedUserCount: activeUserCount,
      });
    }
    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignUser(userId: string, departmentId: string) {
    await this.findOne(departmentId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: { departmentId } });
  }
}
