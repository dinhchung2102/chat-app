import { RelationshipDocument } from 'src/modules/relationships/schema/relationship.schema';

export class NotifyFriendRequestDto {
  userId: string;
  actorName: string;
  relationship: RelationshipDocument;
}
