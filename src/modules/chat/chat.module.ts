import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { Message, MessageSchema } from './schema/message.schema';
import { AuthModule } from '../auth';
import { EventsModule } from 'src/shared/events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => EventsModule),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService, MongooseModule],
})
export class ChatModule {}
