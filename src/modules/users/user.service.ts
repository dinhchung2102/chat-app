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
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { UpdateImageDto } from './dto/update-image';
import * as fs from 'fs';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private readonly cloudinaryService: CloudinaryService,

    @InjectQueue('image-upload') private imageUploadQueue: Queue,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const users = (result[0]?.data as UserProfileDto[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const total = (result[0]?.metadata[0]?.total as number) || 0;

    return {
      message: `Kết quả tìm kiếm với ${typeKeyword === 'email' ? 'email' : typeKeyword === 'phone' ? 'số điện thoại' : 'từ khóa'}: ${keyword}`,
      users,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async updateUserAvatar(userId: string, dto: UpdateImageDto) {
    const { fileBuffer, originalname } = dto;
    const ext = path.extname(originalname);
    const filename = `user-${userId}-${Date.now()}${ext}`;

    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, fileBuffer);

    await this.imageUploadQueue.add('upload', {
      userId,
      type: 'avatar',
      filename,
    });

    // Trả về URL tạm thời
    const avatarUrl = `${process.env.HOST_URL}/uploads/avatars/${filename}`;

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    user.avatar = avatarUrl;
    await user.save();

    return {
      message: 'Cập nhật avatar thành công',
      avatar: avatarUrl,
    };
  }

  async updateUserBackgroundImage(
    userId: string,
    dto: UpdateImageDto,
  ): Promise<{ message: string; backgroundImage: string }> {
    const { fileBuffer, originalname } = dto;
    const ext = path.extname(originalname);

    const uploadsDir = path.join(process.cwd(), 'uploads', 'background-images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `user-${userId}-${Date.now()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, fileBuffer);

    const backgroundImageUrl = `${process.env.HOST_URL}/uploads/background-images/${filename}`;

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    user.backgroundImage = backgroundImageUrl;
    await user.save();

    return {
      message: 'Cập nhật ảnh nền thành công',
      backgroundImage: backgroundImageUrl,
    };
  }
}
