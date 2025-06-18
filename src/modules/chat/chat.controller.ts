import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('send-message')
  async sendMessage(
    @CurrentUser('accountId') accountId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('conversations')
  async getConversations(
    @CurrentUser('accountId') accountId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.chatService.getConversations(
      accountId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('messages/:conversationId')
  async getMessagesByConversationId(
    @Param('conversationId') conversationId: string,
    @CurrentUser('accountId') accountId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.chatService.getMessagesByConversationId(
      conversationId,
      accountId,
      Number(page),
      Number(limit),
    );
  }
}
