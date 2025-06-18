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
import {
  buildPaginationMeta,
  PaginationMeta,
} from 'src/common/helpers/pagination.helpers';

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

  async getConversations(
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{
    message: string;
    conversations: ConversationDocument[];
    pagination: PaginationMeta;
  }> {
    const skip = (page - 1) * limit;

    const total = await this.conversationModel.countDocuments({
      participants: { $in: [new Types.ObjectId(accountId)] },
    });

    const conversations = await this.conversationModel
      .find({
        participants: { $in: [new Types.ObjectId(accountId)] },
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Meta phân trang
    const meta = buildPaginationMeta(total, page, limit);

    return {
      message: 'Lấy danh sách cuộc trò chuyện thành công',
      conversations,
      pagination: meta,
    };
  }

  async getMessagesByConversationId(
    conversationId: string,
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{
    message: string;
    messages: MessageDocument[];
    pagination: PaginationMeta;
  }> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    const isParticipant = conversation.participants.some(
      (participant: AccountDocument) =>
        (participant._id as string) == accountId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'Không có quyền truy cập cuộc trò chuyện này',
      );
    }

    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
      }),
      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
        })
        .sort({ createdAt: -1 }) // Tin nhắn mới nhất trước
        .skip(skip)
        .limit(limit),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      message: 'Lấy danh sách tin nhắn thành công',
      messages,
      pagination,
    };
  }
}
