import type { Redis as IORedis } from "ioredis";
import type { Cache } from "./cache.port.js";

export class RedisCache implements Cache {
  constructor(private redis: IORedis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds) await this.redis.set(key, raw, "EX", ttlSeconds);
    else await this.redis.set(key, raw);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async setIfAbsent<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean> {
    const res = await this.redis.set(
      key,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
      "NX",
    );
    return res === "OK";
  }
}
