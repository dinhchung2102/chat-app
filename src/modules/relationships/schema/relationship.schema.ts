import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Relationships } from 'src/common/enums/relationships.enum';

export type RelationshipDocument = Relationship & Document;

@Schema({ timestamps: true })
export class Relationship {
  @Prop({ required: true })
  actorAccount: Types.ObjectId;

  @Prop({ required: true })
  targetAccount: Types.ObjectId;

  @Prop({ required: false, default: Relationships.PENDING })
  status: Relationships;
}

export const RelationshipsSchema = SchemaFactory.createForClass(Relationship);
