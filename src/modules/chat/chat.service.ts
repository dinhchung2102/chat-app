import { Injectable } from '@nestjs/common';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationType } from 'src/common/enums/conversation.type';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async generateMyCloud(accountId: string) {
    const conversation = await this.conversationModel.create({
      conversationType: ConversationType.CLOUD,
      participants: [new Types.ObjectId(accountId)],
    });

    return conversation;
  }
}
