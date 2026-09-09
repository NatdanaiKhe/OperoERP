import { Module } from '@nestjs/common';
import { CustomerService } from '@/customer/customer.service';
import { CustomerController } from '@/customer/customer.controller';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
