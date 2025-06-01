import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Gender } from 'src/common/enums/gender.enum';
import { SettingDto } from '../dto/setting.dto';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop()
  gender: Gender;

  @Prop({ required: false })
  avatar: string;

  @Prop()
  address: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  backgroundImage: string;

  @Prop()
  bio: string;

  @Prop({ default: { theme: 'light', noti: true, language: 'vie' } })
  settings: SettingDto;
}

export const UserSchema = SchemaFactory.createForClass(User);
