import { RelationshipDocument } from 'src/modules/relationships/schema/relationship.schema';

export class NotifyFriendRequestDto {
  accountId: string;
  actorName: string;
  relationship: RelationshipDocument;
}
