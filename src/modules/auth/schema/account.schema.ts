import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: false })
  password: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roles: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
