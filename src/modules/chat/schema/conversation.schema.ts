import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AccountDocument } from 'src/modules/auth/schema/account.schema';
import { MessageDocument } from './message.schema';
import { ConversationType } from 'src/common/enums/conversation.type';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  conversationType: ConversationType;

  @Prop()
  groupName: string;

  @Prop()
  groupAvatar: string;

  @Prop()
  groupDescription: string;

  @Prop({ required: true, type: [Types.ObjectId], ref: 'Account' })
  participants: AccountDocument[];

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  groupAdmin: AccountDocument;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  groupDeputy: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage: MessageDocument;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
