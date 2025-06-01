import { IsDate, IsEnum, IsString } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';
import { SettingDto } from './setting.dto';
import { Type } from 'class-transformer';

export class UserDto {
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
