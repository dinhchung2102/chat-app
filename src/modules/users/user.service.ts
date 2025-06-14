import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ): Promise<{ message: string; user: UserDocument }> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: dto },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new BadRequestException(`Không tìm thấy user với id: ${userId}`);
      }

      return {
        message: 'Cập nhật người dùng thành công',
        user: updatedUser,
      };
    } catch (error) {
      throw new BadRequestException(
        `Cập nhật user thất bại: ${(error as Error).message}`,
      );
    }
  }

  async getMyProfile(
    userId: string,
  ): Promise<{ message: string; user: UserDocument } | null> {
    try {
      const userDoc = await this.userModel.findById(userId);
      if (!userDoc) throw new NotFoundException('Người dùng không tồn tại');

      const user = userDoc.toObject();
      return { message: 'Lấy thông tin cá nhân thành công', user };
    } catch (error) {
      throw new BadRequestException(
        `Lấy thông tin user thất bại: ${(error as Error).message}`,
      );
    }
  }
}
