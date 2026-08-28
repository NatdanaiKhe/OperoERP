import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  userId: string;
  roles: string[];
  companyId: string;
  isSuperAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    // Optional: allows @CurrentUser('tenantId') to grab just one field
    return data ? user?.[data] : user;
  },
);
