import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcceptFriendDto } from './dto/accept-friend.dto';
import { UnfriendDto } from './dto/unfriend.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request-friend')
  async requestFriend(
    @CurrentUser('accountId') accountId: string,
    @Body() dto: RequestFriendDto,
  ) {
    return this.relationshipsService.requestFriend(accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('accept-request-friend')
  async acceptRequestFriend(
    @CurrentUser('accountId') accountId: string,
    @Body() dto: AcceptFriendDto,
  ) {
    return this.relationshipsService.acceptFriendRequest(accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friend-requests')
  async getFriendRequests(
    @CurrentUser('accountId') accountId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.relationshipsService.getFriendRequests(
      accountId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(
    @CurrentUser('accountId') accountId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.relationshipsService.getFriends(
      accountId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unfriend')
  async unfriend(
    @CurrentUser('accountId') accountId: string,
    @Body() dto: UnfriendDto,
  ) {
    return this.relationshipsService.unfriend(accountId, dto);
  }
}
