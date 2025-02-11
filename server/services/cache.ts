import Redis from "ioredis";
import { Buffer } from "buffer";

// Initialize Redis client with fallback to memory cache if Redis is unavailable
class FallbackCache {
  private memoryCache: Map<string, { data: any; expiry: number }>;
  private redis: Redis | null;
  private useMemoryCache: boolean = false;
  private connectionError: string | null = null;

  constructor() {
    this.memoryCache = new Map();

    if (!process.env.REDIS_URL) {
      console.log("[Cache] No REDIS_URL provided, using memory cache");
      this.useMemoryCache = true;
      this.redis = null;
      return;
    }

    try {
      console.log("[Cache] Initializing Redis connection...");
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // 5 second timeout for initial connection
        retryStrategy: (times) => {
          if (times > 3) {
            this.connectionError = `Failed to connect to Redis after ${times} attempts`;
            this.useMemoryCache = true;
            console.error(`[Cache] ${this.connectionError}, falling back to memory cache`);
            return null;
          }
          const delay = Math.min(times * 1000, 3000);
          console.log(`[Cache] Retrying Redis connection in ${delay}ms...`);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        }
      });

      this.redis.on('error', (err) => {
        if (!this.useMemoryCache) {
          this.connectionError = `Redis error: ${err.message}`;
          console.error(`[Cache] ${this.connectionError}, switching to memory cache`);
          this.useMemoryCache = true;
        }
      });

      this.redis.on('connect', () => {
        console.log("[Cache] Redis connected successfully");
        this.useMemoryCache = false;
        this.connectionError = null;
      });

      this.redis.on('reconnecting', () => {
        console.log("[Cache] Attempting to reconnect to Redis...");
      });
    } catch (error) {
      this.connectionError = error instanceof Error ? error.message : "Unknown Redis initialization error";
      console.error(`[Cache] Failed to initialize Redis: ${this.connectionError}`);
      this.useMemoryCache = true;
      this.redis = null;
    }
  }

  private async useRedis(): Promise<boolean> {
    if (this.useMemoryCache || !this.redis) return false;
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.connectionError = error instanceof Error ? error.message : "Redis ping failed";
      console.error(`[Cache] ${this.connectionError}`);
      this.useMemoryCache = true;
      return false;
    }
  }

  async set(key: string, value: any, expiry: number = 24 * 60 * 60): Promise<void> {
    if (!this.useMemoryCache && await this.useRedis() && this.redis) {
      await this.redis.setex(key, expiry, JSON.stringify(value));
    } else {
      this.memoryCache.set(key, {
        data: value,
        expiry: Date.now() + expiry * 1000
      });
    }
  }

  async get(key: string): Promise<any> {
    if (!this.useMemoryCache && await this.useRedis() && this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (!cached) return null;
      if (cached.expiry < Date.now()) {
        this.memoryCache.delete(key);
        return null;
      }
      return cached.data;
    }
  }

  async setBinary(key: string, data: Buffer, expiry: number = 24 * 60 * 60): Promise<void> {
    const base64Data = data.toString('base64');
    await this.set(key, base64Data, expiry);
  }

  async getBinary(key: string): Promise<Buffer | null> {
    const data = await this.get(key);
    return data ? Buffer.from(data, 'base64') : null;
  }

  async del(key: string): Promise<void> {
    if (!this.useMemoryCache && await this.useRedis() && this.redis) {
      await this.redis.del(key);
    }
    this.memoryCache.delete(key);
  }

  getStatus(): { using: 'redis' | 'memory', error: string | null } {
    return {
      using: this.useMemoryCache ? 'memory' : 'redis',
      error: this.connectionError
    };
  }
}

const cache = new FallbackCache();

export class CacheService {
  private static prefix = "etsyboost:";

  private static getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  static async set(key: string, data: any, expiry: number = 24 * 60 * 60): Promise<void> {
    await cache.set(this.getKey(key), data, expiry);
  }

  static async get<T>(key: string): Promise<T | null> {
    return cache.get(this.getKey(key));
  }

  static async del(key: string): Promise<void> {
    await cache.del(this.getKey(key));
  }

  static async setBinary(key: string, data: Buffer, expiry: number = 24 * 60 * 60): Promise<void> {
    await cache.setBinary(this.getKey(key), data, expiry);
  }

  static async getBinary(key: string): Promise<Buffer | null> {
    return cache.getBinary(this.getKey(key));
  }

  static generateTagKey(title: string, description: string, category: string): string {
    return `tags:${Buffer.from(`${title}:${description}:${category}`).toString("base64")}`;
  }

  static generateWatermarkKey(
    fileHash: string,
    watermarkText: string,
    position: string,
    opacity: number
  ): string {
    return `watermark:${Buffer.from(
      `${fileHash}:${watermarkText}:${position}:${opacity}`
    ).toString("base64")}`;
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.prefix}health:${Date.now()}`;
      await cache.set(testKey, 'test', 5); // 5 seconds expiry
      const result = await cache.get(testKey);
      return result === 'test';
    } catch (error) {
      console.error('[Cache] Health check failed:', error);
      return false;
    }
  }

  static getStatus(): { using: 'redis' | 'memory', error: string | null } {
    return cache.getStatus();
  }
}