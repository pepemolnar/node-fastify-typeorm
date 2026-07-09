const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

// Convert a short duration string ("15m", "7d") to seconds. Used to give Redis
// a TTL that matches a JWT's `expiresIn`, so the two never drift apart.
export function durationToSeconds(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  return Number(match[1]) * UNIT_SECONDS[match[2]];
}
