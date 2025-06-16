import { IsString } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

export class UserProfileDto {
  @IsString()
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
  address: string;
  avatar: string;
  @IsString()
  email: string;
  @IsString()
  phone: string;
  @IsString()
  accountId: string;
  @IsString()
  userId: string;
  backgroundImage: string;
  bio: string;
}
