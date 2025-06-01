import {
  Body,
  Controller,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { UserDocument } from './schema/user.schema';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseFilters(new AllExceptionsFilter())
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create/new-user')
  async createNewUser(@Body() dto: UserDto): Promise<UserDocument> {
    return await this.userService.createNewUser(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/profile')
  async updateCurrentUser(@Req() req, @Body() dto: Partial<UserDto>) {
    const userId = req.user.userId;
    return this.userService.updateUser(userId, dto);
  }
}
