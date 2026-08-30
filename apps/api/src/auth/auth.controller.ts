import {
  Body,
  Controller,
  Delete,
  Delete,
  Get,
  HttpCode,
  Param,
  Param,
  Patch,
  Post,
  Query,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @Get('users')
  @Roles('admin', 'superadmin')
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.authService.listUsers(user.companyId, query);
  }

  @Patch('users/:id')
  @Roles('admin', 'superadmin')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.authService.updateUser(id, dto, req);
  }

  @Delete('users/:id')
  @Roles('admin', 'superadmin')
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    await this.authService.softDeleteUser(id, req);
    return { message: 'User deleted' };
  }

  @Post('invite')
  @Roles('admin', 'superadmin')
  async invite(@Body() dto: InviteDto, @Req() req: Request) {
    const { userId } = await this.authService.invite(dto, req);
    return { message: 'Invitation sent successfully', userId };
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(200)
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    await this.authService.acceptInvite(dto, req);
    return { message: 'Account activated successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto.email, req);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto, req);
    return { message: 'Password reset successfully' };
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
    const companyId = user.userRoles[0]?.role.companyId ?? null;
    const { accessToken, refreshToken } = await this.authService.login(
      user.id,
      roles,
      companyId,
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
