import type { CreateUserDto } from "../types/user.types.js";

// A known password so seeded accounts are trivial to log into locally.
// Meets the createUserSchema min-length (8) rule.
export const DEFAULT_PASSWORD = "Password123!";

// Monotonic counter guarantees unique names/emails across calls without
// reaching for randomness — keeps generated data deterministic for tests.
let seq = 0;

/**
 * Build a valid {@link CreateUserDto} with sensible, unique defaults.
 *
 * The whole point of the factory is that a caller — a test or the seeder —
 * never has to spell out a full user just to get one. Any field can be
 * overridden; everything else is filled in.
 */
export function makeUser(
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto {
  seq += 1;
  return {
    name: `Test User ${seq}`,
    email: `user${seq}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

/** Build `count` distinct users. Overrides apply to every one of them. */
export function makeUsers(
  count: number,
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto[] {
  return Array.from({ length: count }, () => makeUser(overrides));
}
