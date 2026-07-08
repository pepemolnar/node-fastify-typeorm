import { describe, it, expect } from "vitest";
import { createUserSchema } from "../../schemas/user.schema.js";
import {
  makeUser,
  makeUsers,
  DEFAULT_PASSWORD,
} from "../../extras/user.factory.js";

describe("user factory", () => {
  it("produces a user that satisfies createUserSchema", () => {
    expect(() => createUserSchema.parse(makeUser())).not.toThrow();
  });

  it("uses the default password unless overridden", () => {
    expect(makeUser().password).toBe(DEFAULT_PASSWORD);
    expect(makeUser({ password: "custom-secret" }).password).toBe(
      "custom-secret",
    );
  });

  it("honours overrides while defaulting the rest", () => {
    const user = makeUser({ email: "fixed@example.com" });
    expect(user.email).toBe("fixed@example.com");
    expect(user.name).toMatch(/^Test User \d+$/);
  });

  it("generates distinct users so unique-email inserts don't collide", () => {
    const users = makeUsers(5);
    const emails = new Set(users.map((u) => u.email));
    expect(users).toHaveLength(5);
    expect(emails.size).toBe(5);
  });
});
