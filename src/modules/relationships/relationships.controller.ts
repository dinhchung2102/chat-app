import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { PayloadDto } from '../auth/dto/payload-jwt.dto';
import { AcceptFriendDto } from './dto/accept-friend.dto';
import { UnfriendDto } from './dto/unfriend.dto';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request-friend')
  async requestFriend(
    @Req() req: Request,
    @Body() requestFriendDto: RequestFriendDto,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.relationshipsService.requestFriend(
      jwtPayload.accountId,
      requestFriendDto.targetAccountId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept-request-friend')
  async acceptRequestFriend(
    @Req() req: Request,
    @Body() acceptRequestFriendDto: AcceptFriendDto,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.relationshipsService.acceptFriendRequest(
      jwtPayload.accountId,
      acceptRequestFriendDto.relationshipId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('friend-requests')
  async getFriendRequests(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.relationshipsService.getFriendRequests(
      jwtPayload.accountId.toString(),
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.relationshipsService.getFriends(
      jwtPayload.accountId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('unfriend')
  async unfriend(@Req() req: Request, @Body() unfriendDto: UnfriendDto) {
    const jwtPayload: PayloadDto = req.user as PayloadDto;
    return this.relationshipsService.unfriend(
      jwtPayload.accountId.toString(),
      unfriendDto.friendAccountId,
    );
  }
}
