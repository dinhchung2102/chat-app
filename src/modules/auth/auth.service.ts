import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, RoleDocument } from './schema/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account, AccountDocument } from './schema/account.schema';
import { User, UserDocument } from '../users/schema/user.schema';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AccountDto } from './dto/account.dto';
import { plainToInstance } from 'class-transformer';
import { formatPhone } from 'src/shared/utils/formatPhone';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { generateOTP } from 'src/shared/email/generateOTP';
import { PayloadDto } from './dto/payload-jwt.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    private jwtService: JwtService,

    private configService: ConfigService,

    private readonly mailerService: MailerService,
  ) {}

  async createNewRole(dto: CreateRoleDto): Promise<RoleDocument> {
    try {
      const newRole = new this.roleModel({
        roleName: dto.roleName,
        description: dto.description,
        isActive: true,
      });

      return await newRole.save();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 11000) {
        throw new ConflictException({
          message: `roleName:${dto.roleName} đã tồn tại`,
          errorCode: 'ROLENAME_EXISTS',
        });
      }
      throw new BadRequestException(
        `Tạo role thất bại: ${(error as Error).message}`,
      );
    }
  }

  async getRoleByName(roleName: string): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ roleName }).exec();
    if (!role) {
      throw new BadRequestException(`Không tìm thấy role với tên: ${roleName}`);
    }
    return role;
  }

  async createNewAccount(dto: CreateAccountDto): Promise<AccountDocument> {
    try {
      const defaultRole = await this.getRoleByName('user');
      const user = await this.userModel.create({
        fullName: dto.fullName,
        avatar: dto.avatar,
        gender: dto.gender,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth,
        bio: dto.bio,
      });

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

      const newAccount = new this.accountModel({
        phone: formatPhone(dto.phone),
        email: dto.email,
        password: hashedPassword,
        //isActive: default-false
        roles: [...(Array.isArray(dto.role) ? dto.role : []), defaultRole._id],
        user: user._id,
      });

      return await newAccount.save();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 11000) {
        throw new ConflictException({
          message: `Tài khoản đã tồn tại`,
          errorCode: 'EXISTS',
        });
      }
      throw new BadRequestException(
        `Tạo tài khoản thất bại: ${(error as Error).message}`,
      );
    }
  }
  async loginUser(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    account: AccountDto;
  }> {
    try {
      const account = await this.accountModel
        .findOne({ phone: formatPhone(dto.phone) })
        .populate('roles');

      if (!account) throw new NotFoundException('Tài khoản không tồn tại');

      const isMatch = await bcrypt.compare(dto.password, account.password);
      if (!isMatch) throw new UnauthorizedException('Mật khẩu không đúng');

      const roleNames = account.roles.map((role: any) => role.roleName);

      const payload = {
        accountId: account._id,
        phone: account.phone,
        roles: roleNames,
        userId: account.user,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      const activeAccount = await this.accountModel.findByIdAndUpdate(
        account._id,
        { isActive: true, refreshToken },
        { new: true },
      );

      if (!activeAccount)
        throw new NotFoundException(
          'Không thể đăng nhập tài khoản lúc này, vui lòng thử lại',
        );

      const populatedAccount = await activeAccount.populate('user');

      const accountDto = plainToInstance(
        AccountDto,
        populatedAccount.toObject(),
        { excludeExtraneousValues: true },
      );

      return {
        accessToken,
        refreshToken,
        account: accountDto,
      };
    } catch (error) {
      console.error('Lỗi loginUser:', error);
      throw error;
    }
  }

  async refreshTokens(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = dto;

    try {
      // 1. Verify token
      const payload: PayloadDto = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 2. Tìm tài khoản theo payload.accountId
      const account = await this.accountModel
        .findById(payload.accountId)
        .populate('roles');
      if (!account || !account.refreshToken) {
        throw new UnauthorizedException(
          'Refresh token không hợp lệ hoặc đã hết hạn',
        );
      }

      // 3. So sánh refreshToken client gửi với refreshToken trong db
      if (refreshToken != account.refreshToken) {
        throw new UnauthorizedException(
          'Refresh token không hợp lệ hoặc đã hết hạn',
        );
      }

      // 4. Tạo accessToken mới
      const roleNames = account.roles
        .filter((role: any) => role && role.roleName) // đảm bảo role và role.name hợp lệ
        .map((role: any) => role.roleName);

      const newPayload = {
        accountId: account._id,
        phone: account.phone,
        roles: roleNames, // truyền mảng tên role đúng chuẩn
        userId: account.user,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      });

      // 5. Tạo refreshToken mới (tuỳ chọn)
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // 6.lưu refreshToken mới vào db
      account.refreshToken = newRefreshToken;
      await account.save();

      // 7. Trả về tokens mới
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error?.message || 'Token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async sendEmailOTP(
    email: string,
  ): Promise<{ message: string; otp?: string }> {
    const otp: string = generateOTP();
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã xác thực của người đẹp trong ứng dụng ChatHiHi`,
        template: 'otp',
        context: { otp },
      });

      return {
        message: 'OTP đã được gửi tới email của bạn',
      };
    } catch (error) {
      throw new BadRequestException(
        'Không thể gửi mã OTP. Vui lòng thử lại sau.',
        error,
      );
    }
  }
}
