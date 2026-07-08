export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseMs = 100 } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const backoff = baseMs * 2 ** i; // 100, 200, 400…
      const jitter = Math.random() * baseMs; // desync stampedes
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
  throw lastErr;
}
