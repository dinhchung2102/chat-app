import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Relationship,
  RelationshipDocument,
} from './schema/relationship.schema';
import { AuthService } from '../auth';

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    @InjectModel(Relationship.name)
    private relationshipModel: Model<RelationshipDocument>,
  ) {}

  async requestFriend(
    actorAccountId: string,
    targetAccountId: string,
  ): Promise<{ message: string; relationship: RelationshipDocument }> {
    const [actorAccount, targetAccount] = await Promise.all([
      this.authService.getAccountProfile(actorAccountId),
      this.authService.getAccountProfile(targetAccountId),
    ]);
    if (!actorAccount || !targetAccount) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    //Relationship tồn tại
    //find 2 chiều actorAccount & targetAccount
    const [relationshipAB, relationshipBA] = await Promise.all([
      this.relationshipModel.findOne({
        actorAccount: actorAccount.account._id,
        targetAccount: targetAccount.account._id,
      }),
      this.relationshipModel.findOne({
        actorAccount: targetAccount.account._id,
        targetAccount: actorAccount.account._id,
      }),
    ]);

    if (relationshipAB || relationshipBA) {
      throw new ConflictException(
        `Đã thiết lập mối quan hệ: ${relationshipAB ? relationshipAB.status : relationshipBA?.status}`,
      );
    }

    const relationship = await this.relationshipModel.create({
      actorAccount: actorAccount.account._id,
      targetAccount: targetAccount.account._id,
      // status: Relationships.PENDING, //default pending
    });

    return {
      message: 'Gửi lời mời kết bạn thành công',
      relationship: relationship,
    };
  }
}
