import type { CreateUserDto } from "../interface/user.dto.js";

export const DEFAULT_PASSWORD = "Password123!";

let seq = 0;

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
