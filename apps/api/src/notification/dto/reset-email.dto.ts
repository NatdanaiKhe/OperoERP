export interface ResetEmailDto {
  name: string;
  email: string;
  resetUrl: string;
  expiredInMinutes: string;
}
