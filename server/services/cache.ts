import Redis from "ioredis";
import { Buffer } from "buffer";

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Default cache expiry time (24 hours)
const DEFAULT_EXPIRY = 24 * 60 * 60;

export class CacheService {
  // Cache key prefix to avoid collisions
  private static prefix = "etsyboost:";

  // Generate a cache key with prefix
  private static getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // Set cache with expiry
  static async set(
    key: string,
    data: any,
    expiry: number = DEFAULT_EXPIRY
  ): Promise<void> {
    const cacheKey = this.getKey(key);
    const serializedData = JSON.stringify(data);
    await redis.setex(cacheKey, expiry, serializedData);
  }

  // Get cached data
  static async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key);
    const data = await redis.get(cacheKey);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  // Delete cached data
  static async del(key: string): Promise<void> {
    const cacheKey = this.getKey(key);
    await redis.del(cacheKey);
  }

  // Set binary data (for watermarked images/videos)
  static async setBinary(
    key: string,
    data: Buffer,
    expiry: number = DEFAULT_EXPIRY
  ): Promise<void> {
    const cacheKey = this.getKey(key);
    await redis.setex(cacheKey, expiry, data.toString("base64"));
  }

  // Get binary data
  static async getBinary(key: string): Promise<Buffer | null> {
    const cacheKey = this.getKey(key);
    const data = await redis.get(cacheKey);
    if (!data) return null;
    return Buffer.from(data, "base64");
  }

  // Generate cache key for tag generation
  static generateTagKey(title: string, description: string, category: string): string {
    return `tags:${Buffer.from(`${title}:${description}:${category}`).toString("base64")}`;
  }

  // Generate cache key for watermark
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
