import {
  Body,
  Controller,
  Get,
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
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PayloadDto } from '../auth/dto/payload-jwt.dto';

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
  async updateCurrentUser(@Req() req: Request, @Body() dto: Partial<UserDto>) {
    const userProfile: PayloadDto = req.user as PayloadDto;
    return this.userService.updateUser(userProfile.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-profile')
  async getMyProfile(@Req() req: Request) {
    const userProfile: PayloadDto = req.user as PayloadDto;
    return this.userService.getMyProfile(userProfile.userId);
  }
}
