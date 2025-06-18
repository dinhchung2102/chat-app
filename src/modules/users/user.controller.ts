import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { UserDocument } from './schema/user.schema';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { FindUserDto } from './dto/find-user.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

@UseFilters(new AllExceptionsFilter())
// @SkipThrottle()   // Các route bên trong controller này sẽ không bị throttling
@SkipThrottle()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create/new-user')
  async createNewUser(@Body() dto: UserDto): Promise<UserDocument> {
    return await this.userService.createNewUser(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/profile')
  async updateCurrentUser(
    @CurrentUser('accountId') accountId: string,
    @Body() dto: Partial<UserDto>,
  ) {
    return this.userService.updateUser(accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-profile')
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.userService.getMyProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('find-user')
  async findUser(
    @Query() dto: FindUserDto,
    @CurrentUser('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userService.findUser(userId, dto, Number(page), Number(limit));
  }
}
