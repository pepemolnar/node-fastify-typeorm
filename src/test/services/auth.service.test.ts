import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../../services/auth.service.js";
import type { IUserRepository } from "../../types/user.types.js";
import type { User } from "../../entities/user.entity.js";
import type { NotificationService } from "../../services/notification.service.js";
import { hashPassword, verifyPassword } from "../../helpers/password.helper.js";

function fakeModel(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    create: vi.fn(async (data) => ({ id: "1", ...data }) as User),
    getForLogin: vi.fn(async () => null),
    ...overrides,
  } as unknown as IUserRepository;
}

// Notifications are a side effect of register; a stub keeps this suite pure.
function fakeNotifications(): NotificationService {
  return { notify: vi.fn(async () => {}) } as unknown as NotificationService;
}

describe("AuthService", () => {
  it("register capitalizes the name and stores a bcrypt hash, not the password", async () => {
    const create = vi.fn(async (data) => ({ id: "1", ...data }) as User);
    const service = new AuthService(fakeModel({ create }), fakeNotifications());

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
      fakeNotifications(),
    );

    await expect(
      service.verifyCredentials({ email: "a@x.com", password: "password123" }),
    ).resolves.toEqual({ id: "u1", role: "admin" });
  });

  it("verifyCredentials throws 401 when the user is missing", async () => {
    const service = new AuthService(
      fakeModel({ getForLogin: vi.fn(async () => null) }),
      fakeNotifications(),
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
      fakeNotifications(),
    );

    await expect(
      service.verifyCredentials({
        email: "a@x.com",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
