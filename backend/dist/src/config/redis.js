"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = exports.redisClient = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
async function connectRedis() {
    try {
        exports.redisClient = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        exports.redisClient.on('error', (err) => {
            logger_1.logger.error('Redis Client Error:', err);
        });
        exports.redisClient.on('connect', () => {
            logger_1.logger.info('Connected to Redis');
        });
        exports.redisClient.on('ready', () => {
            logger_1.logger.info('Redis client ready');
        });
        exports.redisClient.on('end', () => {
            logger_1.logger.info('Redis connection ended');
        });
        await exports.redisClient.connect();
        // Test the connection
        await exports.redisClient.ping();
        logger_1.logger.info('Redis connection test successful');
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to Redis:', error);
        throw error;
    }
}
async function disconnectRedis() {
    try {
        if (exports.redisClient) {
            await exports.redisClient.quit();
            logger_1.logger.info('Disconnected from Redis');
        }
    }
    catch (error) {
        logger_1.logger.error('Error disconnecting from Redis:', error);
        throw error;
    }
}
// Cache utilities
class CacheService {
    static async get(key) {
        try {
            const value = await exports.redisClient.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            logger_1.logger.error(`Error getting cache key ${key}:`, error);
            return null;
        }
    }
    static async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await exports.redisClient.setEx(key, ttlSeconds, serialized);
            }
            else {
                await exports.redisClient.set(key, serialized);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error setting cache key ${key}:`, error);
        }
    }
    static async del(key) {
        try {
            await exports.redisClient.del(key);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting cache key ${key}:`, error);
        }
    }
    static async exists(key) {
        try {
            const result = await exports.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Error checking cache key ${key}:`, error);
            return false;
        }
    }
    static async increment(key, by = 1) {
        try {
            return await exports.redisClient.incrBy(key, by);
        }
        catch (error) {
            logger_1.logger.error(`Error incrementing cache key ${key}:`, error);
            return 0;
        }
    }
    static async expire(key, ttlSeconds) {
        try {
            await exports.redisClient.expire(key, ttlSeconds);
        }
        catch (error) {
            logger_1.logger.error(`Error setting expiry for cache key ${key}:`, error);
        }
    }
    // Pattern-based operations
    static async getKeys(pattern) {
        try {
            return await exports.redisClient.keys(pattern);
        }
        catch (error) {
            logger_1.logger.error(`Error getting keys with pattern ${pattern}:`, error);
            return [];
        }
    }
    static async deletePattern(pattern) {
        try {
            const keys = await exports.redisClient.keys(pattern);
            if (keys.length > 0) {
                await exports.redisClient.del(keys);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error deleting keys with pattern ${pattern}:`, error);
        }
    }
    // Hash operations for complex data
    static async hGet(key, field) {
        try {
            const result = await exports.redisClient.hGet(key, field);
            return result ?? null;
        }
        catch (error) {
            logger_1.logger.error(`Error getting hash field ${field} from ${key}:`, error);
            return null;
        }
    }
    static async hSet(key, field, value) {
        try {
            await exports.redisClient.hSet(key, field, value);
        }
        catch (error) {
            logger_1.logger.error(`Error setting hash field ${field} in ${key}:`, error);
        }
    }
    static async hGetAll(key) {
        try {
            return await exports.redisClient.hGetAll(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting all hash fields from ${key}:`, error);
            return {};
        }
    }
}
exports.CacheService = CacheService;
// Handle graceful shutdown
process.on('beforeExit', async () => {
    await disconnectRedis();
});
//# sourceMappingURL=redis.js.map