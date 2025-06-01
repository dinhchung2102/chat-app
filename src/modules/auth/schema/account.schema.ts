import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: false })
  password: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Role' })
  roles: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop()
  refreshToken?: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
