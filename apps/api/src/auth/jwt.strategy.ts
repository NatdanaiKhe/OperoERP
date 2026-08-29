import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import { isSuperAdmin } from '@/common/utils/auth.utils';

interface TokenPayload {
  sub: string;
  roles: JwtPayload['roles'];
  companyId: JwtPayload['companyId'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<JwtPayload> {
    return {
      userId: payload.sub,
      roles: payload.roles,
      companyId: payload.companyId,
      isSuperAdmin: isSuperAdmin(payload.roles),
    };
  }
}
