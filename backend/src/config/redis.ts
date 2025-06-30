import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export let redisClient: RedisClientType;

export async function connectRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Disconnected from Redis');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
}

// Cache utilities
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  static async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await redisClient.incrBy(key, by);
    } catch (error) {
      logger.error(`Error incrementing cache key ${key}:`, error);
      return 0;
    }
  }

  static async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redisClient.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Error setting expiry for cache key ${key}:`, error);
    }
  }

  // Pattern-based operations
  static async getKeys(pattern: string): Promise<string[]> {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Error deleting keys with pattern ${pattern}:`, error);
    }
  }

  // Hash operations for complex data
  static async hGet(key: string, field: string): Promise<string | null> {
    try {
      const result = await redisClient.hGet(key, field);
      return result ?? null;
    } catch (error) {
      logger.error(`Error getting hash field ${field} from ${key}:`, error);
      return null;
    }
  }

  static async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await redisClient.hSet(key, field, value);
    } catch (error) {
      logger.error(`Error setting hash field ${field} in ${key}:`, error);
    }
  }

  static async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      logger.error(`Error getting all hash fields from ${key}:`, error);
      return {};
    }
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
}); 