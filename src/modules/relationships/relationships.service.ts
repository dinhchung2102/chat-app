import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Relationship,
  RelationshipDocument,
} from './schema/relationship.schema';
import { AuthService } from '../auth';
import { EventsGateway } from 'src/shared/events/events.gateway';
import { NotifyFriendRequestDto } from 'src/shared/events/dto/notify-friend-request.dto';
import { Relationships } from 'src/common/enums/relationships.enum';
import { NotifyFriendAcceptedDto } from 'src/shared/events/dto/notify-friend-accepted.dto';
import { AccountDocument } from '../auth/schema/account.schema';
import {
  Conversation,
  ConversationDocument,
} from '../chat/schema/conversation.schema';
import { ConversationType } from 'src/common/enums/conversation.type';
import {
  buildPaginationMeta,
  PaginationMeta,
} from 'src/common/helpers/pagination.helpers';
import { RequestFriendDto } from './dto/request-friend.dto';
import { AcceptFriendDto } from './dto/accept-friend.dto';
import { UnfriendDto } from './dto/unfriend.dto';

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly eventsGateway: EventsGateway,
    @InjectModel(Relationship.name)
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async requestFriend(
    actorAccountId: string,
    dto: RequestFriendDto,
  ): Promise<{ message: string; relationship: RelationshipDocument }> {
    const { targetAccountId } = dto;

    if (actorAccountId === targetAccountId) {
      throw new BadRequestException(`Không thể kết bạn với chính mình`);
    }

    const [actorAccount, targetAccount] = await Promise.all([
      this.authService.getAccountProfile(actorAccountId),
      this.authService.getAccountProfile(targetAccountId),
    ]);
    if (!actorAccount || !targetAccount) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    //find 2 chiều actorAccount & targetAccount
    const [relationshipAB, relationshipBA] = await Promise.all([
      this.relationshipModel.findOne({
        actorAccount: actorAccountId,
        targetAccount: targetAccountId,
      }),
      this.relationshipModel.findOne({
        actorAccount: targetAccountId,
        targetAccount: actorAccountId,
      }),
    ]);

    //Relationship tồn tại
    if (relationshipAB || relationshipBA) {
      throw new ConflictException(
        `Đã thiết lập mối quan hệ: ${relationshipAB ? relationshipAB.status : relationshipBA?.status}`,
      );
    }

    //Tạo mới relationship: request mặc định status là pending
    const relationship = await this.relationshipModel.create({
      actorAccount: new Types.ObjectId(actorAccountId),
      targetAccount: new Types.ObjectId(targetAccountId),
      // status: Relationships.PENDING, //default pending
    });

    const notifyFriendRequestDto: NotifyFriendRequestDto = {
      accountId: targetAccountId,
      actorName: actorAccount.account.user.fullName || 'Người lạ',
      relationship: relationship,
    };

    this.eventsGateway.notifyFriendRequest(notifyFriendRequestDto);

    return {
      message: 'Gửi lời mời kết bạn thành công',
      relationship: relationship,
    };
  }

  async acceptFriendRequest(
    targetAccountId: string,
    dto: AcceptFriendDto,
  ): Promise<{
    message: string;
    relationship: RelationshipDocument;
    conversation: ConversationDocument;
  }> {
    const { relationshipId } = dto;
    const relationship = await this.relationshipModel.findById(relationshipId);

    if (!relationship) {
      throw new NotFoundException('Mối quan hệ không tồn tại');
    }

    if (relationship.targetAccount._id != targetAccountId) {
      throw new BadRequestException(
        'Bạn không có quyền chấp nhận lời mời kết bạn',
      );
    }

    const targetAccount =
      await this.authService.getAccountProfile(targetAccountId);

    if (relationship.status !== Relationships.PENDING) {
      throw new BadRequestException(
        'Mối quan hệ không phải là lời mời kết bạn',
      );
    }

    relationship.status = Relationships.ACCEPTED;

    await relationship.save();
    const conversation = await this.conversationModel.create({
      conversationType: ConversationType.PRIVATE,
      participants: [relationship.actorAccount, relationship.targetAccount],
    });
    const notifyFriendAcceptedDto: NotifyFriendAcceptedDto = {
      accountId: (
        relationship.actorAccount as unknown as Types.ObjectId
      ).toString(),
      targetName: targetAccount.account.user.fullName,
      relationship: relationship,
    };

    this.eventsGateway.notifyFriendAccepted(notifyFriendAcceptedDto);

    return {
      message: 'Chấp nhận lời mời kết bạn thành công',
      relationship: relationship,
      conversation: conversation,
    };
  }

  async getFriendRequests(
    targetAccountId: string,
    page: number,
    limit: number,
  ): Promise<{
    message: string;
    relationships: RelationshipDocument[];
    pagination: PaginationMeta;
  }> {
    const skip = (page - 1) * limit;

    const filter = {
      targetAccount: new Types.ObjectId(targetAccountId),
      status: Relationships.PENDING,
    };

    const [total, relationships] = await Promise.all([
      this.relationshipModel.countDocuments(filter),
      this.relationshipModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'actorAccount',
          select: '_id email username',
          populate: {
            path: 'user',
            select:
              'fullName gender dateOfBirth avatar backgroundImage bio address',
          },
        }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      message: 'Lấy danh sách lời mời kết bạn thành công',
      relationships,
      pagination,
    };
  }

  async getFriends(
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{
    message: string;
    friendAccounts: AccountDocument[];
    pagination: PaginationMeta;
  }> {
    const skip = (page - 1) * limit;

    // Điều kiện lọc
    const matchCondition = {
      status: Relationships.ACCEPTED,
      $or: [
        { actorAccount: new Types.ObjectId(accountId) },
        { targetAccount: new Types.ObjectId(accountId) },
      ],
    };

    const total = await this.relationshipModel.countDocuments(matchCondition);

    // Truy vấn relationships có phân trang
    const relationships = await this.relationshipModel
      .find(matchCondition)
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: 'actorAccount',
          select: '_id email username user',
          populate: {
            path: 'user',
            select:
              'fullName gender dateOfBirth avatar backgroundImage bio address',
          },
        },
        {
          path: 'targetAccount',
          select: '_id email username user',
          populate: {
            path: 'user',
            select:
              'fullName gender dateOfBirth avatar backgroundImage bio address',
          },
        },
      ]);

    // Trích danh sách bạn
    const friendAccounts = relationships.map((rel) => {
      if (rel.actorAccount?._id == accountId) {
        return rel.targetAccount;
      }
      return rel.actorAccount;
    });

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      message: 'Lấy danh sách bạn bè thành công',
      friendAccounts,
      pagination,
    };
  }

  async unfriend(
    accountId: string,
    dto: UnfriendDto,
  ): Promise<{ message: string; relationship: RelationshipDocument }> {
    const { friendAccountId } = dto;
    const relationship = await this.relationshipModel.findOneAndDelete({
      $or: [
        {
          actorAccount: new Types.ObjectId(accountId),
          targetAccount: new Types.ObjectId(friendAccountId),
        },
        {
          actorAccount: new Types.ObjectId(friendAccountId),
          targetAccount: new Types.ObjectId(accountId),
        },
      ],
    });

    if (!relationship) {
      throw new NotFoundException('Mối quan hệ không tồn tại');
    }

    return {
      message: 'Hủy kết bạn thành công',
      relationship: relationship,
    };
  }
}
