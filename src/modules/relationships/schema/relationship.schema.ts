import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Relationships } from 'src/common/enums/relationships.enum';
import { UserDocument } from 'src/modules/users/schema/user.schema';

export type RelationshipDocument = Relationship & Document;

@Schema({ timestamps: true })
export class Relationship {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Account' })
  actorAccount: UserDocument;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Account' })
  targetAccount: UserDocument;

  @Prop({ required: false, default: Relationships.PENDING })
  status: Relationships;
}

export const RelationshipsSchema = SchemaFactory.createForClass(Relationship);
