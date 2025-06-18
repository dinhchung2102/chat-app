import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationType } from 'src/common/enums/conversation.type';
import { SendMessageDto } from './dto/send-message.dto';
import { Message, MessageDocument } from './schema/message.schema';
import { MessageType } from 'src/common/enums/message.type';
import { MessageStatus } from 'src/common/enums/message.status';
import { AccountDocument } from '../auth/schema/account.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,

    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  async generateMyCloud(accountId: string) {
    const conversation = await this.conversationModel.create({
      conversationType: ConversationType.CLOUD,
      participants: [new Types.ObjectId(accountId)],
    });

    return conversation;
  }

  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<{ message: string; messagesent: MessageDocument }> {
    const conversation = await this.conversationModel.findById(
      dto.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    const isParticipant = conversation.participants.some(
      (participant: AccountDocument) => (participant._id as string) == senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException();
    }
    const messageSent = await this.messageModel.create({
      sender: new Types.ObjectId(senderId),
      content: dto.content,
      conversationId: new Types.ObjectId(dto.conversationId),
      messageType: MessageType.TEXT,
      status: MessageStatus.SENT,
      seenBy: [new Types.ObjectId(senderId)],
    });
    return { message: 'Đã gửi', messagesent: messageSent };
  }
}
