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
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { generateOTP } from 'src/shared/email/generateOTP';
import { PayloadDto } from './dto/payload-jwt.dto';
import { RedisService } from 'src/shared/redis/redis.service';
import { SendOtpDto, VerifyOTPDto } from './dto/email-otp.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AuthService {
  private readonly hashRound: number = 10;
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

    private chatService: ChatService,

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

  async createNewAccount(dto: CreateAccountDto): Promise<{ message: string }> {
    try {
      const defaultRole = await this.getRoleByName('user');
      const existUsername = await this.accountModel.findOne({
        username: dto.username,
      });
      const existEmail = await this.accountModel.findOne({ email: dto.email });

      if (existUsername) {
        throw new ConflictException({
          message: `Tên đăng nhập đã được sử dụng`,
          errorCode: 'USERNAME_EXISTS',
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
      await this.redisService.delete(`otp:${dto.email}`);

      const user = await this.userModel.create({
        fullName: dto.fullName,
        avatar: dto.avatar,
        gender: dto.gender,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth,
        bio: dto.bio,
      });

      const saltRounds = this.hashRound;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

      const newAccount = await this.accountModel.create({
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        roles: [...(Array.isArray(dto.role) ? dto.role : []), defaultRole._id],
        user: user._id,
      });

      await this.chatService.generateMyCloud(newAccount._id as string);

      return {
        message: 'Tài khoản đã được tạo thành công',
      };
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
    message: string;
    accessToken: string;
    refreshToken: string;
    account: AccountDto;
  }> {
    try {
      const account = await this.accountModel
        .findOne({ username: dto.username })
        .populate<{ roles: RoleDocument[] }>('roles');

      if (!account) throw new NotFoundException('Tài khoản không tồn tại');

      const isMatch = await bcrypt.compare(dto.password, account.password);
      if (!isMatch) {
        this.logger.error(
          `Bro: ${account.username} nhập sai mật khẩu`,
          undefined,
          AuthService.name,
        );
        throw new UnauthorizedException('Mật khẩu không đúng');
      }
      const roleNames = account.roles.map((role) => role.roleName);

      const payload = {
        accountId: account._id,
        username: account.username,
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
      const populatedAccount = await (
        await activeAccount.populate('user')
      ).populate({
        path: 'roles',
        select: 'roleName -_id',
      });
      const accountObj = populatedAccount.toObject();

      accountObj.roles = (accountObj.roles || []).map((r: any) => r.roleName);

      const accountDto = plainToInstance(AccountDto, accountObj, {
        excludeExtraneousValues: true,
      });
      return {
        message: 'Đăng nhập thành công',
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
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
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
        username: account.username,
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
        message: 'Refresh token đã được cập nhật thành công',
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

  async sendEmailOTP(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
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
        message: 'OTP đăng ký tài khoản đã được gửi tới email của bạn',
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

  async resendEmailOTP(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
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

  async verifyEmailOTP(dto: VerifyOTPDto): Promise<{ message: string }> {
    const { email, authOTP } = dto;
    const otpRedis = await this.redisService.getOtp(email);

    if (otpRedis && otpRedis.otp === authOTP) {
      return {
        message: 'OTP đã được xác thực thành công',
      };
    } else {
      throw new UnauthorizedException('OTP hết hạn hoặc không hợp lệ');
    }
  }

  async requestResetPassword(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
    const otp: string = generateOTP();

    try {
      const existEmail = await this.accountModel.findOne({ email: email });
      if (!existEmail) {
        throw new NotFoundException({
          message: `Tài khoản không tồn tại`,
          errorCode: 'ACCOUNT_NOT_FOUND',
        });
      }
      //Set OTP thời hạn 5 phút mặc định vào redis
      await this.redisService.setOtp(email, otp);
      await this.mailerService.sendMail({
        to: email,
        subject: `${otp} là mã lấy lại mật khẩu của người đẹp trong ứng dụng ChatHiHi`,
        template: 'reset-password',
        context: { otp },
      });

      return {
        message: 'OTP lấy lại mật khẩu đã được gửi tới email của bạn',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể gửi yêu cầu lúc này, vui lòng thử lại sau',
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, authOTP, newPassword } = dto;
    const account = await this.accountModel.findOne({ email: email });
    if (!account) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }
    await this.verifyEmailOTP({ email, authOTP });
    await this.redisService.delete(`otp:${email}`);
    const saltRounds = this.hashRound;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    account.password = hashedPassword;
    await account.save();
    return {
      message: 'Mật khẩu đã được lấy lại thành công',
    };
  }

  async changePassword(
    accountId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const account = await this.accountModel.findOne({ _id: accountId });
    if (!account) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }
    const saltRounds = this.hashRound;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    account.password = hashedPassword;

    await account.save();
    return {
      message: 'Mật khẩu đã được thay đổi thành công',
    };
  }

  async getAccountProfile(
    accountId: string,
  ): Promise<{ message: string; account: AccountDocument }> {
    const account = await this.accountModel
      .findById(accountId)
      .populate({
        path: 'user',
        select: 'fullName',
      })
      .select('-password');
    if (!account) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }
    return { message: 'Thông tin tài khoản tìm thấy', account };
  }
}
