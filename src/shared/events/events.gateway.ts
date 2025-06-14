import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotifyFriendRequestDto } from './dto/notify-friend-request.dto';

interface SocketWithAuth extends Socket {
  data: {
    userId: string;
  };
  handshake: Socket['handshake'] & {
    auth: {
      userId: string;
    };
  };
}

@WebSocketGateway() // Mặc định dùng chung port với HTTP
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: unknown): string {
    console.log('📨 Received ping from client:', data);
    return 'pong';
  }

  async handleConnection(client: SocketWithAuth) {
    const userId = client.handshake.auth?.userId;
    if (!userId) {
      console.log('❌ Không có userId trong handshake');
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    await client.join(`user_${userId}`);
    console.log(`✅ User ${userId} connected with socket ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('events')
  handleEvent(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: SocketWithAuth,
  ): WsResponse<unknown> {
    console.log(`Received:`, data);
    return {
      event: 'events',
      data,
    };
  }

  emitToClient(data: unknown) {
    this.server.emit('events', {
      event: 'events',
      data,
    });
  }

  notifyFriendRequest(dto: NotifyFriendRequestDto) {
    this.server.to(`user_${dto.userId}`).emit('friend_request_received', {
      type: 'FRIEND_REQUEST',
      message: `${dto.actorName} đã gửi một lời mời kết bạn`,
      relationship: dto.relationship,
      timestamp: new Date(),
    });
  }
}
