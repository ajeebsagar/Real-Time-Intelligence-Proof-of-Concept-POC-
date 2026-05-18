// WebSocket Manager using Socket.IO

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../../shared/logger';
import { SOCKET_EVENTS } from '../../shared/constants';

export interface SocketUser {
  userId: string;
  sessionId?: string;
}

export class WebSocketManager {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Socket> = new Map();

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string; sessionId?: string }) => {
        this.userSockets.set(data.userId, socket);
        socket.data.userId = data.userId;
        socket.data.sessionId = data.sessionId;
        
        logger.info(`User authenticated: ${data.userId}`);
        socket.emit('authenticated', { success: true });
      });

      // Handle live input
      socket.on(SOCKET_EVENTS.LIVE_INPUT, (_data: any) => {
        logger.debug('Received live input', { socketId: socket.id });
        // This will be handled by the realtime module
      });

      // Handle disconnect
      socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        logger.info(`Client disconnected: ${socket.id}`);
        
        if (socket.data.userId) {
          this.userSockets.delete(socket.data.userId);
        }
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error:', { socketId: socket.id, error });
      });
    });
  }

  emitToUser(userId: string, event: string, data: any): void {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit(event, data);
      logger.debug(`Emitted ${event} to user ${userId}`);
    } else {
      logger.warn(`User socket not found: ${userId}`);
    }
  }

  emitToSession(sessionId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.sockets.sockets.forEach((socket) => {
      if (socket.data.sessionId === sessionId) {
        socket.emit(event, data);
      }
    });

    logger.debug(`Emitted ${event} to session ${sessionId}`);
  }

  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
    logger.debug(`Broadcasted ${event}`);
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  getConnectedUsers(): number {
    return this.userSockets.size;
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

export default new WebSocketManager();
