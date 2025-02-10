import Redis from "ioredis";
import { Buffer } from "buffer";

// Initialize Redis client with fallback to memory cache if Redis is unavailable
class FallbackCache {
  private memoryCache: Map<string, { data: any; expiry: number }>;
  private redis: Redis | null;
  private useMemoryCache: boolean = false;

  constructor() {
    this.memoryCache = new Map();

    // Only try to connect to Redis if REDIS_URL is provided
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1, // Reduce retry attempts
          retryStrategy: (times) => {
            if (times > 1) {
              this.useMemoryCache = true; // Switch to memory cache after first retry
              return null; // Stop retrying
            }
            return Math.min(times * 100, 1000);
          },
          lazyConnect: true // Don't connect immediately
        });

        // Single error handler to avoid log spam
        this.redis.on('error', () => {
          if (!this.useMemoryCache) {
            console.log("Redis unavailable, using memory cache");
            this.useMemoryCache = true;
          }
        });
      } catch (error) {
        this.useMemoryCache = true;
        this.redis = null;
      }
    } else {
      this.useMemoryCache = true;
      this.redis = null;
    }
  }

  private async useRedis(): Promise<boolean> {
    if (this.useMemoryCache || !this.redis) return false;
    try {
      await this.redis.ping();
      return true;
    } catch {
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