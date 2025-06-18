import { MessageDocument } from 'src/modules/chat/schema/message.schema';

export class NewMessageDto {
  accountId: string;
  message: MessageDocument;
}
