import { describe, it, expect, vi } from "vitest";
import type { IUserRepository } from "../../modules/users/domain/user.repository.js";
import type { EventBus } from "../../shared/domain/events/event-bus.js";
import { RegisterUser } from "../../modules/auth/application/register-user.js";
import { VerifyCredentials } from "../../modules/auth/application/verify-credentials.js";
import { User } from "../../modules/users/domain/user.js";

function fakeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    list: vi.fn(async () => ({ data: [], total: 0 })),
    listByCursor: vi.fn(async () => ({ data: [], nextCursor: null })),
    findById: vi.fn(async () => null),
    findForLogin: vi.fn(async () => null),
    add: vi.fn(async () => {}),
    save: vi.fn(async () => {}),
    softDelete: vi.fn(async () => {}),
    ...overrides,
  };
}

// register publishes a domain event instead of doing side work inline; a stub
// bus lets us assert the event without wiring a real queue.
function fakeEvents(): EventBus {
  return {
    publish: vi.fn(async () => {}),
    subscribe: vi.fn(),
  } as unknown as EventBus;
}

describe("RegisterUser", () => {
  it("normalizes the name, stores a bcrypt hash, and publishes UserRegistered", async () => {
    const add = vi.fn(async (_user: User) => {});
    const events = fakeEvents();
    const useCase = new RegisterUser(fakeRepo({ add }), events);

    const snapshot = await useCase.execute({
      name: "ada lovelace",
      email: "ada@x.com",
      password: "password123",
    });

    const user = add.mock.calls[0][0] as User;
    expect(user.name).toBe("Ada Lovelace");
    expect(user.passwordHash).not.toBe("password123");
    expect(await user.verifyPassword("password123")).toBe(true);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UserRegistered", email: "ada@x.com" }),
    );
    expect(snapshot).not.toHaveProperty("passwordHash");
  });
});

describe("VerifyCredentials", () => {
  it("returns id and role on a correct password", async () => {
    const user = await User.create({
      name: "Ada",
      email: "a@x.com",
      password: "password123",
      role: "admin",
    });
    const useCase = new VerifyCredentials(
      fakeRepo({ findForLogin: vi.fn(async () => user) }),
    );

    await expect(
      useCase.execute({ email: "a@x.com", password: "password123" }),
    ).resolves.toEqual({ id: user.id, role: "admin" });
  });

  it("throws 401 when the user is missing", async () => {
    const useCase = new VerifyCredentials(
      fakeRepo({ findForLogin: vi.fn(async () => null) }),
    );

    await expect(
      useCase.execute({ email: "a@x.com", password: "password123" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("throws 401 on a wrong password", async () => {
    const user = await User.create({
      name: "Ada",
      email: "a@x.com",
      password: "correct-password",
    });
    const useCase = new VerifyCredentials(
      fakeRepo({ findForLogin: vi.fn(async () => user) }),
    );

    await expect(
      useCase.execute({ email: "a@x.com", password: "wrong-password" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
