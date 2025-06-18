import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { NotifyFriendRequestDto } from './dto/notify-friend-request.dto';
import { NotifyFriendAcceptedDto } from './dto/notify-friend-accepted.dto';
import { NewMessageDto } from './dto/new-message.dto';
import { PayloadDto } from 'src/modules/auth/dto/payload-jwt.dto';

interface SocketWithAuth extends Socket {
  data: {
    accountId: string;
  };
  handshake: Socket['handshake'] & {
    auth: {
      token?: string;
    };
  };
}

@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: SocketWithAuth) {
    const token = client.handshake.auth?.token?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ Không có JWT token trong handshake');
      client.disconnect();
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as PayloadDto;
      const accountId = payload.accountId;

      client.data.accountId = accountId;
      await client.join(`account_${accountId}`);

      console.log(`Authenticated socket: ${client.id}, account: ${accountId}`);
    } catch (err) {
      console.log('Token không hợp lệ hoặc đã hết hạn', (err as Error).message);
      client.disconnect();
    }
  }

  handleDisconnect(client: SocketWithAuth) {
    console.log(
      `Socket disconnected: ${client.id}, account: ${client.data?.accountId}`,
    );
  }

  notifyFriendRequest(dto: NotifyFriendRequestDto) {
    this.server.to(`account_${dto.accountId}`).emit('friend_request_received', {
      type: 'FRIEND_REQUEST',
      message: `${dto.actorName} đã gửi một lời mời kết bạn`,
      relationship: dto.relationship,
      timestamp: new Date(),
    });
  }

  notifyFriendAccepted(dto: NotifyFriendAcceptedDto) {
    this.server.to(`account_${dto.accountId}`).emit('friend_request_accepted', {
      type: 'FRIEND_REQUEST_ACCEPTED',
      message: `${dto.targetName} đã chấp nhận lời mời kết bạn`,
      relationship: dto.relationship,
      timestamp: new Date(),
    });
  }

  newMessage(dto: NewMessageDto) {
    this.server.to(`account_${dto.accountId}`).emit('new_message', {
      type: 'NEW_MESSAGE',
      message: dto.message,
      timestamp: new Date(),
    });
  }
}
