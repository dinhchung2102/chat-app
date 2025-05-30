import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  roleName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
