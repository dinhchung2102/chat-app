import { RelationshipDocument } from 'src/modules/relationships/schema/relationship.schema';

export class NotifyFriendAcceptedDto {
  accountId: string;
  targetName: string; //Gán vào message để thông báo cho người gửi lời mời
  relationship: RelationshipDocument;
}
