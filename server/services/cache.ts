import Redis from "ioredis";
import { Buffer } from "buffer";

// Initialize Redis client with fallback to memory cache if Redis is unavailable
class FallbackCache {
  private memoryCache: Map<string, { data: any; expiry: number }>;
  private redis: Redis | null;

  constructor() {
    this.memoryCache = new Map();
    try {
      this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        reconnectOnError: (err) => {
          console.error("Redis connection error:", err);
          return true; // Try to reconnect
        },
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn("Redis connection failed, falling back to memory cache");
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000); // Exponential backoff
        }
      });

      this.redis.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.redis = null; // Fallback to memory cache on error
      });
    } catch (error) {
      console.error("Redis initialization failed:", error);
      this.redis = null;
    }
  }

  private async useRedis(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  async set(key: string, value: any, expiry: number = 24 * 60 * 60): Promise<void> {
    const hasRedis = await this.useRedis();
    if (hasRedis && this.redis) {
      await this.redis.setex(key, expiry, JSON.stringify(value));
    } else {
      this.memoryCache.set(key, {
        data: value,
        expiry: Date.now() + expiry * 1000
      });
    }
  }

  async get(key: string): Promise<any> {
    const hasRedis = await this.useRedis();
    if (hasRedis && this.redis) {
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
    const hasRedis = await this.useRedis();
    if (hasRedis && this.redis) {
      await this.redis.del(key);
    }
    this.memoryCache.delete(key);
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
}