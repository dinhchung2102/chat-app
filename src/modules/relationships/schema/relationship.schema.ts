import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Relationships } from 'src/common/enums/relationships.enum';
import { AccountDocument } from 'src/modules/auth/schema/account.schema';

export type RelationshipDocument = Relationship & Document;

@Schema({ timestamps: true })
export class Relationship {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Account' })
  actorAccount: AccountDocument;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Account' })
  targetAccount: AccountDocument;

  @Prop({ required: false, default: Relationships.PENDING })
  status: Relationships;
}

export const RelationshipsSchema = SchemaFactory.createForClass(Relationship);
