import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { UserDocument } from './schema/user.schema';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { FindUserDto } from './dto/find-user.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { UpdateImageDto } from './dto/update-image';

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
    @CurrentUser('userId') userId: string,
    @Body() dto: Partial<UserDto>,
  ) {
    return this.userService.updateUser(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/avatar')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    const dto: UpdateImageDto = {
      fileBuffer: file.buffer,
      originalname: file.originalname,
    };
    return this.userService.updateUserAvatar(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/background-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadBackgroundImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    const dto: UpdateImageDto = {
      fileBuffer: file.buffer,
      originalname: file.originalname,
    };
    return this.userService.updateUserBackgroundImage(userId, dto);
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
