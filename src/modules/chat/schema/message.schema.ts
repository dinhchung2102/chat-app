import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ConversationDocument } from './conversation.schema';
import { AccountDocument } from 'src/modules/auth/schema/account.schema';
import { MessageType } from 'src/common/enums/message.type';
import { MessageStatus } from 'src/common/enums/message.status';
import { MessageReaction } from 'src/common/enums/message.reaction';
import { InternalServerErrorException } from '@nestjs/common';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Conversation' })
  conversationId: ConversationDocument;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Account' })
  sender: AccountDocument;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, default: MessageType.TEXT })
  messageType: MessageType;

  @Prop({ required: true, default: MessageStatus.SENT })
  status: MessageStatus;

  @Prop({ type: [Types.ObjectId], ref: 'Account' })
  seenBy: AccountDocument[];

  @Prop({ type: [Types.ObjectId], ref: 'Account' })
  deletedFor: AccountDocument[];

  @Prop({ type: [Types.ObjectId], ref: 'Account' })
  reactions: {
    accountId: AccountDocument;
    reaction: MessageReaction;
  }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.post('save', async function (doc: MessageDocument, next) {
  try {
    const conversationModel = doc.model('Conversation');
    await conversationModel.findByIdAndUpdate(doc.conversationId, {
      lastMessage: doc._id,
    });
  } catch (error) {
    throw new InternalServerErrorException(error);
  }
  next();
});
