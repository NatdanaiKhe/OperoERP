export interface AppEnv {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  WEB_APP_URL: string;
  INVITE_TOKEN_TTL_HOURS: number;
  RESET_TOKEN_TTL_HOURS: number;
  RESEND_INVITE_TEMPLATE_ID?: string;
  RESEND_RESET_TEMPLATE_ID?: string;
}
