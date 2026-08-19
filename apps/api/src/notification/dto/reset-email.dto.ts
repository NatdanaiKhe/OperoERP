import { IsEmail, IsString, IsUrl } from 'class-validator';

export class ResetEmailDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsUrl({ require_tld: false })
  resetUrl!: string;
}
