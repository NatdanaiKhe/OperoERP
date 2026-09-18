import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '@/common/utils/cookie-options';

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async profile(@CurrentUser() user: JwtPayload) {
    return this.authService.profile(user.userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @Get('users')
  @ApiBearerAuth()
  @Roles('admin', 'superadmin')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.authService.listUsers(user.companyId, query);
  }

  @Patch('users/:id')
  @ApiBearerAuth()
  @Roles('admin', 'superadmin')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.authService.updateUser(id, dto, req);
  }

  @Delete('users/:id')
  @ApiBearerAuth()
  @Roles('admin', 'superadmin')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    await this.authService.softDeleteUser(id, req);
    return { message: 'User deleted' };
  }

  @Post('invite')
  @ApiBearerAuth()
  @Roles('admin', 'superadmin')
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Invite a new user' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async invite(@Body() dto: InviteDto, @Req() req: Request) {
    const { userId } = await this.authService.invite(dto, req);
    return { message: 'Invitation sent successfully', userId };
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept invitation and activate account' })
  @ApiResponse({ status: 200, description: 'Account activated' })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    await this.authService.acceptInvite(dto, req);
    return { message: 'Account activated successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if address exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto.email, req);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto, req);
    return { message: 'Password reset successfully' };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, description: 'Login successful, access token returned' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 201, description: 'Token refreshed' })
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
  @ApiOperation({ summary: 'Logout and clear refresh token' })
  @ApiResponse({ status: 201, description: 'Logged out' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies[REFRESH_COOKIE], req);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.config));
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current password' })
  @ApiResponse({ status: 201, description: 'Password changed' })
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
