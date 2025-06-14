import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserDocument } from 'src/modules/users/schema/user.schema';
import { RoleDocument } from './role.schema';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: false, unique: true })
  email: string;

  @Prop({ required: false })
  password: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Role' })
  roles: RoleDocument[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: UserDocument;

  @Prop()
  refreshToken?: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
