import {
  Controller,
  Post,
  Body,
  UseFilters,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDocument } from './schema/role.schema';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { CreateAccountDto } from './dto/create-account.dto';
import { LoginDto } from './dto/login.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { SendOtpDto, VerifyOTPDto } from './dto/email-otp.dto';
import { Response, Request } from 'express';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

const THROTTLE_TTL = 5 * 60 * 1000; // 5 minutes
const THROTTLE_LIMIT = 5;

@UseFilters(new AllExceptionsFilter())
@SkipThrottle()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create/new-role')
  @HttpCode(HttpStatus.CREATED)
  async createNewRole(@Body() dto: CreateRoleDto): Promise<RoleDocument> {
    return await this.authService.createNewRole(dto);
  }

  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })
  @Post('create/new-account')
  @HttpCode(HttpStatus.CREATED)
  async createNewAccount(@Body() dto: CreateAccountDto) {
    return this.authService.createNewAccount(dto);
  }

  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })
  @SkipThrottle({ default: false })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, account } =
      await this.authService.loginUser(dto);

    // Gán cookie nhưng vẫn để Interceptor xử lý response
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      account,
    };
  }
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens({ refreshToken });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return {
      message: 'Access token đã được làm mới',
      accessToken,
    };
  }

  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })
  @SkipThrottle({ default: false })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendEmailOTP(@Body() dto: SendOtpDto) {
    return this.authService.sendEmailOTP(dto);
  }

  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })
  @SkipThrottle({ default: false })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendEmailOTP(@Body() dto: SendOtpDto) {
    return this.authService.resendEmailOTP(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOTP(@Body() dto: VerifyOTPDto) {
    return this.authService.verifyEmailOTP(dto);
  }

  @Post('request-reset-password')
  @HttpCode(HttpStatus.OK)
  async requestResetPassword(@Body() dto: SendOtpDto) {
    return this.authService.requestResetPassword(dto);
  }

  @Put('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('accountId') accountId: string,
  ) {
    return this.authService.changePassword(accountId, dto.newPassword);
  }
}
