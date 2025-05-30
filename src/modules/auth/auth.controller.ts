import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDocument } from './schema/role.schema';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';

@UseFilters(new AllExceptionsFilter())
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create/new-role')
  async createNewRole(@Body() dto: CreateRoleDto): Promise<RoleDocument> {
    return await this.authService.createNewRole(dto);
  }
}
