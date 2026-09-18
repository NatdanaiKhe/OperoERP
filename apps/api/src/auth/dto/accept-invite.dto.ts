import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ example: 'invite-token-abc123' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: 'newSecurePass123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
