import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../../services/auth.service.js";
import type { UserModel } from "../../models/user.model.js";
import type { User } from "../../entities/user.entity.js";
import { hashPassword, verifyPassword } from "../../helpers/password.helper.js";

function fakeModel(overrides: Partial<UserModel> = {}): UserModel {
  return {
    create: vi.fn(async (data) => ({ id: "1", ...data }) as User),
    getForLogin: vi.fn(async () => null),
    ...overrides,
  } as unknown as UserModel;
}

describe("AuthService", () => {
  it("register capitalizes the name and stores a bcrypt hash, not the password", async () => {
    const create = vi.fn(async (data) => ({ id: "1", ...data }) as User);
    const service = new AuthService(fakeModel({ create }));

    await service.register({
      name: "ada lovelace",
      email: "ada@x.com",
      password: "password123",
    });

    const arg = create.mock.calls[0][0];
    expect(arg.name).toBe("Ada Lovelace");
    expect(arg.passwordHash).not.toBe("password123");
    expect(await verifyPassword("password123", arg.passwordHash)).toBe(true);
  });

  it("verifyCredentials returns id and role on a correct password", async () => {
    const passwordHash = await hashPassword("password123");
    const service = new AuthService(
      fakeModel({
        getForLogin: vi.fn(
          async () => ({ id: "u1", role: "admin", passwordHash }) as User,
        ),
      }),
    );

    await expect(
      service.verifyCredentials({ email: "a@x.com", password: "password123" }),
    ).resolves.toEqual({ id: "u1", role: "admin" });
  });

  it("verifyCredentials throws 401 when the user is missing", async () => {
    const service = new AuthService(
      fakeModel({ getForLogin: vi.fn(async () => null) }),
    );

    await expect(
      service.verifyCredentials({ email: "a@x.com", password: "password123" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("verifyCredentials throws 401 on a wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    const service = new AuthService(
      fakeModel({
        getForLogin: vi.fn(
          async () => ({ id: "u1", role: "user", passwordHash }) as User,
        ),
      }),
    );

    await expect(
      service.verifyCredentials({
        email: "a@x.com",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
