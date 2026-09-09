import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from '@/customer/dto/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
