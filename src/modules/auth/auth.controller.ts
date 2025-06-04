import {
  Controller,
  Post,
  Body,
  UseFilters,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDocument } from './schema/role.schema';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { CreateAccountDto } from './dto/create-account.dto';
import { LoginDto } from './dto/login.dto';
import { AccountDocument } from './schema/account.schema';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { SendOtpDto } from './dto/email-otp.dto';
import { Response, Request } from 'express';

@UseFilters(new AllExceptionsFilter())
@SkipThrottle()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create/new-role')
  async createNewRole(@Body() dto: CreateRoleDto): Promise<RoleDocument> {
    return await this.authService.createNewRole(dto);
  }

  @SkipThrottle({ default: true })
  @Post('create/new-account')
  async createNewAccount(
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDocument> {
    return await this.authService.createNewAccount(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @SkipThrottle({ default: false })
  @Post('login')
  async loginUser(@Body() dto: LoginDto, @Res() res: Response): Promise<void> {
    const { accessToken, refreshToken, account } =
      await this.authService.loginUser(dto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, account });
  }

  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refreshToken'];
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @SkipThrottle({ default: false })
  @Post('send-otp')
  async sendEmailOTP(@Body() dto: SendOtpDto) {
    return this.authService.sendEmailOTP(dto.email);
  }
}
