import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { PayloadDto } from '../auth/dto/payload-jwt.dto';
import { AcceptFriendDto } from './dto/accept-friend.dto';

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
}
