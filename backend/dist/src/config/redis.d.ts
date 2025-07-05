import { RedisClientType } from 'redis';
export declare let redisClient: RedisClientType;
export declare function connectRedis(): Promise<void>;
export declare function disconnectRedis(): Promise<void>;
export declare class CacheService {
    static get<T>(key: string): Promise<T | null>;
    static set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    static del(key: string): Promise<void>;
    static exists(key: string): Promise<boolean>;
    static increment(key: string, by?: number): Promise<number>;
    static expire(key: string, ttlSeconds: number): Promise<void>;
    static getKeys(pattern: string): Promise<string[]>;
    static deletePattern(pattern: string): Promise<void>;
    static hGet(key: string, field: string): Promise<string | null>;
    static hSet(key: string, field: string, value: string): Promise<void>;
    static hGetAll(key: string): Promise<Record<string, string>>;
}
