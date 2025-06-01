import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/http-exception.filter';
import { UserDocument } from './schema/user.schema';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@UseFilters(new AllExceptionsFilter())
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create/new-user')
  async createNewUser(@Body() dto: UserDto): Promise<UserDocument> {
    return await this.userService.createNewUser(dto);
  }
}
