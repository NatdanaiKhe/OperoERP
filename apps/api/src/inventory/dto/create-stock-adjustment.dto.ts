// dto/create-stock-adjustment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum ManualStockMovementType {
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  WRITE_OFF = 'WRITE_OFF',
}

export class CreateStockAdjustmentDto {
  @ApiProperty({ description: 'Product being adjusted' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ enum: ManualStockMovementType })
  @IsEnum(ManualStockMovementType)
  type!: ManualStockMovementType;

  @ApiProperty({
    description: 'Signed quantity: positive to add, negative to remove',
  })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ description: 'Required for ADJUSTMENT and WRITE_OFF' })
  @ValidateIf((o) => o.type !== ManualStockMovementType.RECEIPT)
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
