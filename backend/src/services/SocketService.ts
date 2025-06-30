import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
  constructor(private io: SocketIOServer) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('join_user_room', (userId: string) => {
        socket.join(`user_${userId}`);
        logger.debug(`Socket ${socket.id} joined user room: ${userId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user_${userId}`).emit(event, data);
    logger.debug(`Emitted ${event} to user ${userId}`);
  }

  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug(`Emitted ${event} to all connected clients`);
  }
} 