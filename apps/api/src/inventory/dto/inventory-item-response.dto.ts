import { ApiProperty } from '@nestjs/swagger';

export class InventoryItemResponseDto {
  @ApiProperty({ nullable: true, description: 'Null for synthesized zero-stock rows' })
  id?: string | null;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ nullable: true })
  reorderPoint?: number | null;

  @ApiProperty({ description: 'true if quantity <= reorderPoint' })
  isLowStock!: boolean;
}
