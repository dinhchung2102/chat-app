import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';
import { UserModule } from '../users/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Relationship,
  RelationshipsSchema,
} from './schema/relationship.schema';
import { AuthModule } from '../auth';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Relationship.name, schema: RelationshipsSchema },
    ]),
    UserModule,
    AuthModule,
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
})
export class RelationshipsModule {}
