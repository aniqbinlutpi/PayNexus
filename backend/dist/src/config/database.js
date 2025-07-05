"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('Connected to PostgreSQL database');
        // Test the connection
        await exports.prisma.$queryRaw `SELECT 1`;
        logger_1.logger.info('Database connection test successful');
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to database:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        logger_1.logger.info('Disconnected from PostgreSQL database');
    }
    catch (error) {
        logger_1.logger.error('Error disconnecting from database:', error);
        throw error;
    }
}
// Handle graceful shutdown
process.on('beforeExit', async () => {
    await disconnectDatabase();
});
//# sourceMappingURL=database.js.map