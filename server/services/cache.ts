import { Buffer } from "buffer";

interface CacheEntry<T> {
  data: T;
  expiry: number;
  size: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number; // Maximum cache size in bytes
  private currentSize: number;

  constructor(maxSizeInMB: number = 100) { // Default 100MB limit
    this.cache = new Map();
    this.maxSize = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
    this.currentSize = 0;

    // Cleanup expired items periodically (every 5 minutes)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private calculateSize(data: any): number {
    try {
      const str = JSON.stringify(data);
      return str.length * 2; // Approximate size in bytes (UTF-16)
    } catch {
      return 0; // If can't stringify (e.g., binary data), return 0
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    }
  }

  private makeRoom(size: number) {
    if (size > this.maxSize) {
      throw new Error("Item too large for cache");
    }

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiry - b[1].expiry);

    while (this.currentSize + size > this.maxSize && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }

  async set<T>(key: string, data: T, expiry: number = 24 * 60 * 60): Promise<void> {
    try {
      const size = this.calculateSize(data);
      this.makeRoom(size);

      const entry: CacheEntry<T> = {
        data,
        expiry: Date.now() + expiry * 1000,
        size
      };

      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.currentSize -= oldEntry.size;
      }

      this.cache.set(key, entry);
      this.currentSize += size;
    } catch (error) {
      console.error("[Cache] Error setting key:", key, error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = this.cache.get(key);
      if (!cached) return null;

      if (cached.expiry < Date.now()) {
        this.currentSize -= cached.size;
        this.cache.delete(key);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.error("[Cache] Error getting key:", key, error);
      return null;
    }
  }

  async setBinary(key: string, data: Buffer, expiry: number = 24 * 60 * 60): Promise<void> {
    const base64Data = data.toString('base64');
    await this.set(key, base64Data, expiry);
  }

  async getBinary(key: string): Promise<Buffer | null> {
    const data = await this.get<string>(key);
    return data ? Buffer.from(data, 'base64') : null;
  }

  async del(key: string): Promise<void> {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    } catch (error) {
      console.error("[Cache] Error deleting key:", key, error);
    }
  }

  getStatus(): { using: 'memory', size: number, maxSize: number, items: number } {
    return {
      using: 'memory',
      size: this.currentSize,
      maxSize: this.maxSize,
      items: this.cache.size
    };
  }
}

const cache = new MemoryCache();

export class CacheService {
  private static prefix = "etsyboost:";

  private static getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  static async set<T>(key: string, data: T, expiry: number = 24 * 60 * 60): Promise<void> {
    await cache.set(this.getKey(key), data, expiry);
  }

  static async get<T>(key: string): Promise<T | null> {
    return cache.get<T>(this.getKey(key));
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
      const result = await cache.get<string>(testKey);
      return result === 'test';
    } catch (error) {
      console.error('[Cache] Health check failed:', error);
      return false;
    }
  }

  static getStatus(): { using: 'memory', size: number, maxSize: number, items: number } {
    return cache.getStatus();
  }
}