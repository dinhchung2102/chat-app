import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PayloadDto } from '../auth/dto/payload-jwt.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('send-message')
  async sendMessage(@Req() req: Request, @Body() dto: SendMessageDto) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.chatService.sendMessage(jwtPayload.accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('conversations')
  async getConversations(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.chatService.getConversations(
      jwtPayload.accountId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('messages/:conversationId')
  async getMessagesByConversationId(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.chatService.getMessagesByConversationId(
      conversationId,
      jwtPayload.accountId,
      Number(page),
      Number(limit),
    );
  }
}
