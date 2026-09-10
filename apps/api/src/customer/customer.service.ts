import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from '@/customer/dto/create-customer.dto';
import { UpdateCustomerDto } from '@/customer/dto/update-customer.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from 'database';
import { FindCustomersDto } from '@/customer/dto/find-customer.dto';
import type { Request } from 'express';
import { AuditAction, AuditLogService } from '@/audit/audit-log.service';

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: {
        companyId_email: {
          email: createCustomerDto.email,
          companyId: companyId,
        },
      },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'Customer with this email already exists in this company',
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        companyId,
      },
    });

    await this.auditLog.log({
      action: AuditAction.CUSTOMER_CREATED,
      userId: requestingUserId,
      req,
      metadata: { customerId: customer.id, email: customer.email },
    });
    return customer;
  }

  async findAll(
    companyId: string,
    {
      email,
      name,
      taxId,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    }: FindCustomersDto,
  ) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      companyId,
      email: email ? { contains: email, mode: 'insensitive' } : undefined,
      name: name ? { contains: name, mode: 'insensitive' } : undefined,
      taxId: taxId ? { contains: taxId, mode: 'insensitive' } : undefined,
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, companyId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id, companyId, deletedAt: null },
    });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const emailChanged =
      updateCustomerDto.email && updateCustomerDto.email !== existing.email;

    if (emailChanged) {
      const emailExists = await this.prisma.customer.findUnique({
        where: {
          companyId_email: {
            email: updateCustomerDto.email!,
            companyId,
          },
        },
      });
      if (emailExists) {
        throw new ConflictException(
          'Customer with this email already exists in this company',
        );
      }
    }

    const customer = await this.prisma.customer.update({
      where: { id, companyId, deletedAt: null },
      data: updateCustomerDto,
    });

    await this.auditLog.log({
      action: AuditAction.CUSTOMER_UPDATED,
      userId: requestingUserId,
      req,
      metadata: { customerId: id, email: customer.email },
    });
    return customer;
  }

  async delete(
    id: string,
    companyId: string,
    requestingUserId: string,
    req: Request,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const customer = await this.prisma.customer.update({
      where: { id, companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.log({
      action: AuditAction.CUSTOMER_DELETED,
      userId: requestingUserId,
      req,
      metadata: { customerId: id, email: existing.email },
    });
    return customer;
  }
}
