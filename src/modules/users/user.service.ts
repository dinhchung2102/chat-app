import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model, Types } from 'mongoose';
import { UserDto } from './dto/user.dto';
import { FindUserDto } from './dto/find-user.dto';
import {
  buildPaginationMeta,
  PaginationMeta,
} from 'src/common/helpers/pagination.helpers';
import { getTypeFormat } from 'src/shared/utils/getFormatType';
import { formatPhone } from 'src/shared/utils/formatPhone';
import { escapeRegex } from 'src/shared/utils/escapeRegex';
import { UserProfileDto } from './dto/user-profile.dto';

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

  async findUser(
    userId: string,
    dto: FindUserDto,
    page: number,
    limit: number,
  ): Promise<{
    message: string;
    users: UserProfileDto[];
    pagination: PaginationMeta;
  }> {
    const { keyword } = dto;

    if (!keyword?.trim()) {
      throw new BadRequestException('Thiếu từ khóa tìm kiếm');
    }

    const rawKeyword = keyword.trim();
    const typeKeyword = getTypeFormat(rawKeyword);

    let exactMatchKeyword = rawKeyword;
    let regexKeyword = escapeRegex(rawKeyword);

    if (typeKeyword === 'phone') {
      exactMatchKeyword = formatPhone(rawKeyword);
    } else if (typeKeyword === 'email') {
      // không cần regex cho email
      regexKeyword = '';
    }

    const searchConditions: any[] = [];

    // fullName
    if (regexKeyword) {
      searchConditions.push({
        fullName: { $regex: regexKeyword, $options: 'i' },
      });
    }

    // nếu là email/phone thì match chính xác
    if (typeKeyword === 'email') {
      searchConditions.push({ 'account.email': exactMatchKeyword });
    } else if (typeKeyword === 'phone') {
      searchConditions.push({ 'account.phone': exactMatchKeyword });
    }

    const skip = (page - 1) * limit;

    const aggregatePipeline = [
      { $match: { _id: { $ne: new Types.ObjectId(userId) } } },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: 'user',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      {
        $match: {
          $or: searchConditions,
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                userId: '$_id',
                fullName: 1,
                gender: 1,
                dateOfBirth: 1,
                accountId: '$account._id',
                email: '$account.email',
                phone: '$account.phone',
                avatar: 1,
                bio: 1,
                backgroundImage: 1,
                address: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await this.userModel.aggregate(aggregatePipeline);
    const users = (result[0]?.data as UserProfileDto[]) || [];
    const total = (result[0]?.metadata[0]?.total as number) || 0;

    return {
      message: `Kết quả tìm kiếm với ${typeKeyword === 'email' ? 'email' : typeKeyword === 'phone' ? 'số điện thoại' : 'từ khóa'}: ${keyword}`,
      users,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }
}
