import { IsEmail, IsString, IsUrl } from 'class-validator';

export class WelcomeEmailDto {
  @IsString()
  companyName!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsUrl({ require_tld: false })
  inviteUrl!: string;
}
