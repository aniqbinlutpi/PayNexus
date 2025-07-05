"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const logger_1 = require("../utils/logger");
class SocketService {
    constructor(io) {
        this.io = io;
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Socket connected: ${socket.id}`);
            socket.on('join_user_room', (userId) => {
                socket.join(`user_${userId}`);
                logger_1.logger.debug(`Socket ${socket.id} joined user room: ${userId}`);
            });
            socket.on('disconnect', () => {
                logger_1.logger.info(`Socket disconnected: ${socket.id}`);
            });
        });
    }
    emitToUser(userId, event, data) {
        this.io.to(`user_${userId}`).emit(event, data);
        logger_1.logger.debug(`Emitted ${event} to user ${userId}`);
    }
    emitToAll(event, data) {
        this.io.emit(event, data);
        logger_1.logger.debug(`Emitted ${event} to all connected clients`);
    }
}
exports.SocketService = SocketService;
//# sourceMappingURL=SocketService.js.map