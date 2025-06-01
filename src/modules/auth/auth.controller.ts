import { Controller, Post, Body, UseFilters, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDocument } from './schema/role.schema';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { CreateAccountDto } from './dto/create-account.dto';
import { LoginDto } from './dto/login.dto';
import { AccountDto } from './dto/account.dto';
import { AccountDocument } from './schema/account.schema';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';

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
  async loginUser(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; account: AccountDto }> {
    return await this.authService.loginUser(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }
}
