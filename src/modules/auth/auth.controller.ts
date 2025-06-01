import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDocument } from './schema/role.schema';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { CreateAccountDto } from './dto/create-account.dto';
import { LoginDto } from './dto/login.dto';
import { AccountDto } from './dto/account.dto';
import { AccountDocument } from './schema/account.schema';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@UseFilters(new AllExceptionsFilter())
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create/new-role')
  async createNewRole(@Body() dto: CreateRoleDto): Promise<RoleDocument> {
    return await this.authService.createNewRole(dto);
  }

  @Post('create/new-account')
  async createNewAccount(
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDocument> {
    return await this.authService.createNewAccount(dto);
  }

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

  // @Post('logout')
  // async logout(@Body() dto: { accountId: string }) {
  //   await this.accountModel.findByIdAndUpdate(dto.accountId, {
  //     refreshToken: null,
  //     isActive: false,
  //   });
  //   return { success: true };
  // }
}
