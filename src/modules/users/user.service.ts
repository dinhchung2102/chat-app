import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async createNewUser(dto: UserDto): Promise<UserDocument> {
    try {
      const newUser = new this.userModel(dto);

      return await newUser.save();
    } catch (error) {
      throw new BadRequestException(
        `Tạo user thất bại: ${(error as Error).message}`,
      );
    }
  }
}
