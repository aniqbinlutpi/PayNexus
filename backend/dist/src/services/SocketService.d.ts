import { Server as SocketIOServer } from 'socket.io';
export declare class SocketService {
    private io;
    constructor(io: SocketIOServer);
    private setupEventHandlers;
    emitToUser(userId: string, event: string, data: any): void;
    emitToAll(event: string, data: any): void;
}
