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

  async updateUser(
    userId: string,
    dto: Partial<UserDto>,
  ): Promise<UserDocument> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: dto },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new BadRequestException(`Không tìm thấy user với id: ${userId}`);
      }

      return updatedUser;
    } catch (error) {
      throw new BadRequestException(
        `Cập nhật user thất bại: ${(error as Error).message}`,
      );
    }
  }

  async getMyProfile(userId: string): Promise<UserDocument | null> {
    try {
      const user = this.userModel.findById(userId);

      if (user != null) {
        return user;
      } else return null;
    } catch (error) {
      throw new BadRequestException(
        `Lấy thông tin user thất bại: ${(error as Error).message}`,
      );
    }
  }
}
