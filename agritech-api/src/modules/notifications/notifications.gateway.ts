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
        // Join the user+org room so per-user notifications can be scoped to
        // a single organization (a user in multiple orgs shouldn't receive
        // org A's notifications while logged into org B).
        client.join(`user:${client.user.id}:org:${organizationId}`);
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
      if (client.user) {
        client.leave(`user:${client.user.id}:org:${client.organizationId}`);
      }
    }

    // Join new organization room
    client.organizationId = data.organizationId;
    client.join(`org:${data.organizationId}`);
    client.join(`user:${client.user.id}:org:${data.organizationId}`);

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
   * Send a notification to a specific user. When organizationId is provided
   * (it should be — every notification row carries one), the message is
   * scoped to the user+org room so a user with sessions in multiple orgs
   * only sees the notification while connected to the matching org.
   * The legacy `user:${userId}` path remains for transient calls without org.
   */
  sendToUser(userId: string, notification: any, organizationId?: string) {
    const room = organizationId
      ? `user:${userId}:org:${organizationId}`
      : `user:${userId}`;
    this.server.to(room).emit('notification:new', notification);
    this.logger.debug(
      `Notification sent to ${room}: ${notification.title}`,
    );
  }

  /**
   * Send a notification to all users in an organization
   */
  sendToOrganization(organizationId: string, notification: any) {
    this.server.to(`org:${organizationId}`).emit('notification:new', notification);
    this.logger.debug(`Notification sent to organization ${organizationId}: ${notification.title}`);
  }

  /**
   * Emit a notification:read event to a specific user (for syncing read state across clients)
   */
  emitRead(userId: string, notificationId: string, readAt: string) {
    this.server.to(`user:${userId}`).emit('notification:read', {
      notificationId,
      readAt,
    });
    this.logger.debug(`Notification read event sent to user ${userId}: ${notificationId}`);
  }

  /**
   * Emit a notification:read-all event to a specific user
   */
  emitReadAll(userId: string, count: number, readAt: string) {
    this.server.to(`user:${userId}`).emit('notification:read-all', {
      count,
      readAt,
    });
    this.logger.debug(`Read-all event sent to user ${userId}: ${count} notifications`);
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
    // 1. Query param (legacy)
    const queryToken = client.handshake.query.token as string;
    if (queryToken) return queryToken;

    // 2. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3. httpOnly cookie (`agg_access`) — set by /auth/login + /auth/refresh-token.
    // socket.io-client must connect with `withCredentials: true` for the cookie
    // to be sent on the upgrade request.
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [rawKey, ...rest] = part.split('=');
        if (rawKey?.trim() === 'agg_access' && rest.length > 0) {
          return rest.join('=').trim();
        }
      }
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
