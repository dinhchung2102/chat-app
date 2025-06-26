import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Types } from 'mongoose';
import { Gender } from 'src/common/enums/gender.enum';
import { SettingDto } from 'src/modules/users/dto/setting.dto';
export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  isActive: boolean;

  role: Types.ObjectId[];

  @IsString()
  fullName: string;
  avatar: string;
  @IsEnum(Gender, { message: 'Gender không hợp lệ' })
  gender: Gender;
  address: string;

  @IsDate()
  @Type(() => Date)
  dateOfBirth: Date;
  bio: string;
  settings: SettingDto;

  @IsString()
  @IsNotEmpty()
  authOTP: string;
}
