import { Body, Controller, Post, Req, Res, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '@/common/utils/cookie-options';

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('profile')
  async profile(@CurrentUser() user: JwtPayload) {
    return this.authService.profile(user.userId);
  }

  @Get('users')
  @Roles('admin')
  async listUsers() {
    return this.authService.listUsers();
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    await this.authService.register(
      dto.username,
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      req,
    );
    return { message: 'User registered successfully' };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      dto.email,
      dto.password,
      req,
    );
    const roles = user.userRoles.map((ur) => ur.role.name);
    const { accessToken, refreshToken } = await this.authService.login(
      user.id,
      roles,
      req,
    );
    await this.authService.updateLastLogin(user.id);

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldToken = req.cookies[REFRESH_COOKIE];
    const { accessToken, refreshToken } = await this.authService.refresh(
      oldToken,
      req,
    );

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies[REFRESH_COOKIE], req);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.config));
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(user.userId, dto, req);
    return { message: 'Password changed successfully' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      ...refreshCookieOptions(this.config),
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }
}
