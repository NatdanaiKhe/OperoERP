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
import { CustomerService } from '@/customer/customer.service';
import { CreateCustomerDto } from '@/customer/dto/create-customer.dto';
import { UpdateCustomerDto } from '@/customer/dto/update-customer.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import type { Request } from 'express';
import { FindCustomersDto } from '@/customer/dto/find-customer.dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
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
  findAll(@CurrentUser() user: JwtPayload, @Query() filter: FindCustomersDto) {
    return this.customerService.findAll(user.companyId, filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.customerService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.customerService.update(
      id,
      updateCustomerDto,
      user.companyId,
      user.userId,
      req,
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.customerService.delete(id, user.companyId, user.userId, req);
  }
}
