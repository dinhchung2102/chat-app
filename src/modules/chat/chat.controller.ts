import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
}
