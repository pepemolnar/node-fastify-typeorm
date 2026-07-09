import type { Redis } from "ioredis";

const ROTATE = `
local cur = redis.call('GET', KEYS[1])
if not cur then return 'MISSING' end
if cur ~= ARGV[1] then redis.call('DEL', KEYS[1]); return 'REUSE' end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 'OK'`;

export type RotateResult = "OK" | "MISSING" | "REUSE";

export interface IRefreshTokenStore {
  issue(family: string, jti: string): Promise<void>;
  rotate(family: string, oldJti: string, newJti: string): Promise<RotateResult>;
  revoke(family: string): Promise<void>;
}

export class RefreshTokenStore implements IRefreshTokenStore {
  constructor(
    private redis: Redis,
    private ttlSeconds: number,
  ) {}
  private key(family: string) {
    return `refresh:${family}`;
  }

  async issue(family: string, jti: string): Promise<void> {
    await this.redis.set(this.key(family), jti, "EX", this.ttlSeconds);
  }
  async rotate(
    family: string,
    oldJti: string,
    newJti: string,
  ): Promise<RotateResult> {
    return (await this.redis.eval(
      ROTATE,
      1,
      this.key(family),
      oldJti,
      newJti,
      String(this.ttlSeconds),
    )) as RotateResult;
  }
  async revoke(family: string): Promise<void> {
    await this.redis.del(this.key(family));
  }
}
