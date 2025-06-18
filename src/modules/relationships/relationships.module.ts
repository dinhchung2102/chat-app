import { forwardRef, Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';
import { UserModule } from '../users/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Relationship,
  RelationshipsSchema,
} from './schema/relationship.schema';
import { AuthModule } from '../auth';
import { EventsModule } from 'src/shared/events/events.module';
import { ChatModule } from '../chat/chat.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Relationship.name, schema: RelationshipsSchema },
    ]),
    UserModule,
    AuthModule,
    EventsModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
})
export class RelationshipsModule {}
