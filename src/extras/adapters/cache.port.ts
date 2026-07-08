export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  // Atomic "set only if the key is absent" — returns false if it already
  // existed. Encodes the value the same way as `set`, so `get` reads it back.
  setIfAbsent<T>(key: string, value: T, ttlSeconds: number): Promise<boolean>;
}
