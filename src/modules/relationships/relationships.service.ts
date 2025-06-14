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

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly eventsGateway: EventsGateway,
    @InjectModel(Relationship.name)
    private relationshipModel: Model<RelationshipDocument>,
  ) {}

  async requestFriend(
    actorAccountId: string,
    targetAccountId: string,
  ): Promise<{ message: string; relationship: RelationshipDocument }> {
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
      userId: targetAccountId,
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
    relationshipId: string,
  ): Promise<{ message: string; relationship: RelationshipDocument }> {
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
    const notifyFriendAcceptedDto: NotifyFriendAcceptedDto = {
      userId: (
        relationship.actorAccount as unknown as Types.ObjectId
      ).toString(),
      targetName: targetAccount.account.user.fullName,
      relationship: relationship,
    };

    this.eventsGateway.notifyFriendAccepted(notifyFriendAcceptedDto);

    return {
      message: 'Chấp nhận lời mời kết bạn thành công',
      relationship: relationship,
    };
  }
}
