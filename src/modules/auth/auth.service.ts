import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, RoleDocument } from './schema/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { RedisService } from 'src/shared/redis/redis.service';
import { VerifyOTPDto } from './dto/email-otp.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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

    private redisService: RedisService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createNewRole(dto: CreateRoleDto): Promise<RoleDocument> {
    try {
      const existRole = await this.roleModel.findOne({
        roleName: dto.roleName,
      });
      if (existRole) {
        throw new ConflictException({
          message: `roleName:${dto.roleName} đã tồn tại`,
          errorCode: 'ROLENAME_EXISTS',
        });
      }
      const newRole = new this.roleModel({
        roleName: dto.roleName,
        description: dto.description,
        isActive: true,
      });

      return await newRole.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể đăng nhập, vui lòng thử lại sau',
      );
    }
  }

  async getRoleByName(roleName: string): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ roleName }).exec();
    if (!role) {
      throw new NotFoundException(`Không tìm thấy role với tên: ${roleName}`);
    }
    return role;
  }

  async createNewAccount(dto: CreateAccountDto): Promise<AccountDocument> {
    try {
      const defaultRole = await this.getRoleByName('user');
      const existPhone = await this.accountModel.findOne({
        phone: formatPhone(dto.phone),
      });
      const existEmail = await this.accountModel.findOne({ email: dto.email });

      if (existPhone) {
        throw new ConflictException({
          message: `Số điện thoại đã được sử dụng`,
          errorCode: 'PHONE_EXISTS',
        });
      }
      if (existEmail) {
        throw new ConflictException({
          message: `Email đã được sử dụng`,
          errorCode: 'EMAIL_EXISTS',
        });
      }

      await this.verifyEmailOTP({
        email: dto.email,
        authOTP: dto.authOTP,
      });

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
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể tạo mới tài khoản, vui lòng thử lại sau',
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
        .populate<{ roles: RoleDocument[] }>('roles');

      if (!account) throw new NotFoundException('Tài khoản không tồn tại');

      const isMatch = await bcrypt.compare(dto.password, account.password);
      if (!isMatch) {
        this.logger.error(
          `Bro: ${account.phone} nhập sai mật khẩu`,
          undefined,
          AuthService.name,
        );
        throw new UnauthorizedException('Mật khẩu không đúng');
      }
      const roleNames = account.roles.map((role) => role.roleName);

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

      // Convert dữ liệu Mongoose sang DTO
      const populatedAccount = await activeAccount.populate('user');
      const accountDto = plainToInstance(
        AccountDto,
        populatedAccount.toObject(),
        {
          excludeExtraneousValues: true,
        },
      );

      return {
        accessToken,
        refreshToken,
        account: accountDto,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể đăng nhập, vui lòng thử lại sau',
      );
    }
  }

  async refreshTokens(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = dto;

    try {
      const payload: PayloadDto = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const account = await this.accountModel
        .findById(payload.accountId)
        .populate<{ roles: RoleDocument[] }>('roles');
      if (
        !account ||
        !account.refreshToken ||
        refreshToken != account.refreshToken
      ) {
        throw new UnauthorizedException(
          'Refresh token không hợp lệ hoặc đã hết hạn',
        );
      }

      // Tạo accessToken mới
      const roleNames = account.roles.map((role) => role.roleName);

      const newPayload = {
        accountId: account._id,
        phone: account.phone,
        roles: roleNames,
        userId: account.user,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      });

      // Tạo refreshToken mới
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // lưu refreshToken mới vào db
      account.refreshToken = newRefreshToken;
      await account.save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể đăng nhập, vui lòng thử lại sau',
      );
    }
  }

  async sendEmailOTP(
    email: string,
  ): Promise<{ message: string; otp?: string }> {
    const otp: string = generateOTP();
    const existEmail = await this.accountModel.findOne({ email: email });
    if (existEmail) {
      throw new ConflictException({
        message: `Email đã được sử dụng`,
        errorCode: 'EMAIL_EXISTS',
      });
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã xác thực của người đẹp trong ứng dụng ChatHiHi`,
        template: 'otp',
        context: { otp },
      });

      //Set OTP thời hạn 5 phút mặc định vào redis
      await this.redisService.setOtp(email, otp);

      return {
        message: 'OTP đã được gửi tới email của bạn',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể đăng nhập, vui lòng thử lại sau',
      );
    }
  }

  async resendEmailOTP(
    email: string,
  ): Promise<{ message: string; otp?: string }> {
    // Sinh OTP mới
    const otp: string = generateOTP();

    try {
      // Gửi mail
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã xác thực của người đẹp trong ứng dụng ChatHiHi`,
        template: 'otp',
        context: { otp },
      });

      // Lưu OTP mới vào Redis, TTL 5 phút
      await this.redisService.setOtp(email, otp);

      return {
        message: 'OTP mới đã được gửi đến email của bạn',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể đăng nhập, vui lòng thử lại sau',
      );
    }
  }

  async verifyEmailOTP(
    dto: VerifyOTPDto,
  ): Promise<{ message: string; success: boolean }> {
    const { email, authOTP } = dto;
    const otpRedis = await this.redisService.getOtp(email);

    if (otpRedis && otpRedis.otp === authOTP) {
      await this.redisService.delete(`otp:${email}`);
      return {
        message: 'OTP đã được xác thực thành công',
        success: true,
      };
    } else {
      throw new UnauthorizedException('OTP hết hạn hoặc không hợp lệ');
    }
  }
}
