import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { Types } from 'mongoose';
import { Gender } from 'src/common/enums/gender.enum';
import { SettingDto } from 'src/modules/users/dto/setting.dto';
export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0|\+84)[0-9]{9}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone: string;

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
}
