import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CustomerService } from '@/customer/customer.service';
import { CreateCustomerDto } from '@/customer/dto/create-customer.dto';
import { UpdateCustomerDto } from '@/customer/dto/update-customer.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import type { Request } from 'express';
import { FindCustomersDto } from '@/customer/dto/find-customer.dto';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermissions('customer:create')
  @ApiOperation({ summary: 'Create a customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: Request,
  ) {
    return this.customerService.create(
      createCustomerDto,
      user.companyId,
      user.userId,
      req,
    );
  }

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved' })
  findAll(@Query() filter: FindCustomersDto) {
    return this.customerService.findAll(filter);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved' })
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('customer:update')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.customerService.update(id, updateCustomerDto, user.userId, req);
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.customerService.delete(id, user.userId, req);
  }
}
