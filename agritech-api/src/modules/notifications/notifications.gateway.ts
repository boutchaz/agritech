import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
  };
  organizationId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development, or specific ones in production
      if (!origin ||
          origin.includes('localhost') ||
          origin.endsWith('.thebzlab.online') ||
          origin.includes('agritech')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from query or auth header
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);

      if (!payload || !payload.sub) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.user = {
        id: payload.sub,
        email: payload.email,
      };

      // Extract organization ID from query
      const organizationId = client.handshake.query.organizationId as string;
      if (organizationId) {
        client.organizationId = organizationId;
        // Join organization room
        client.join(`org:${organizationId}`);
      }

      // Join user-specific room
      client.join(`user:${client.user.id}`);

      // Track connected user
      if (!this.connectedUsers.has(client.user.id)) {
        this.connectedUsers.set(client.user.id, new Set());
      }
      this.connectedUsers.get(client.user.id).add(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${client.user.id}, Org: ${organizationId || 'none'})`);

      // Emit connection success to client
      client.emit('connected', {
        userId: client.user.id,
        organizationId: organizationId,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user?.id) {
      const userSockets = this.connectedUsers.get(client.user.id);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.user.id);
        }
      }
      this.logger.log(`Client disconnected: ${client.id} (User: ${client.user.id})`);
    } else {
      this.logger.log(`Client disconnected: ${client.id} (unauthenticated)`);
    }
  }

  @SubscribeMessage('join-organization')
  handleJoinOrganization(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { organizationId: string },
  ) {
    if (!client.user) {
      return { error: 'Not authenticated' };
    }

    // Leave previous organization room if any
    if (client.organizationId) {
      client.leave(`org:${client.organizationId}`);
    }

    // Join new organization room
    client.organizationId = data.organizationId;
    client.join(`org:${data.organizationId}`);

    this.logger.log(`User ${client.user.id} joined organization ${data.organizationId}`);
    return { success: true, organizationId: data.organizationId };
  }

  @SubscribeMessage('mark-read')
  handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.user) {
      return { error: 'Not authenticated' };
    }

    // Emit to all user's connected clients to sync read state
    this.server.to(`user:${client.user.id}`).emit('notification:read', {
      notificationId: data.notificationId,
      readAt: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('mark-all-read')
  handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) {
      return { error: 'Not authenticated' };
    }

    // Emit to all user's connected clients
    this.server.to(`user:${client.user.id}`).emit('notification:read-all', {
      readAt: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Send a notification to a specific user
   */
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
    this.logger.debug(`Notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send a notification to all users in an organization
   */
  sendToOrganization(organizationId: string, notification: any) {
    this.server.to(`org:${organizationId}`).emit('notification:new', notification);
    this.logger.debug(`Notification sent to organization ${organizationId}: ${notification.title}`);
  }

  emitToOrganization(
    organizationId: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  /**
   * Get count of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from query params
    const queryToken = client.handshake.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('SUPABASE_JWT_SECRET') ||
                     this.configService.get<string>('JWT_SECRET');

      return this.jwtService.verify(token, { secret });
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error.message}`);
      return null;
    }
  }
}
