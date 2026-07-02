import { describe, it, expect, vi } from "vitest";
import { UserService } from "../../services/user.service.js";
import type { UserModel } from "../../models/user.model.js";
import type { User } from "../../entities/user.entity.js";

// One helper builds a fake model; each test overrides only what it cares about.
function fakeModel(overrides: Partial<UserModel> = {}): UserModel {
  return {
    get: vi.fn(async () => ({ data: [], total: 0, limit: 20, offset: 0 })),
    getById: vi.fn(async () => null),
    getFirst: vi.fn(async () => null),
    create: vi.fn(async (data) => ({ id: "1", ...data }) as User),
    createMany: vi.fn(async (items: Partial<User>[]) =>
      items.map((d, i) => ({ id: String(i), ...d }) as User),
    ),
    update: vi.fn(async () => null),
    softDelete: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as UserModel;
}

describe("UserService", () => {
  // Note: duplicate-email rejection now lives in UserModel.create (closest to
  // the DB), so it is covered in the model + integration suites, not here.
  it("capitalizes the name before handing it to the model", async () => {
    const create = vi.fn(async (data) => data as User);
    const service = new UserService(fakeModel({ create }));

    await service.createUser({
      name: "ada lovelace",
      email: "ada@x.com",
      password: "password123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ada Lovelace" }),
    );
  });

  it("capitalizes every name in a bulk create", async () => {
    const createMany = vi.fn(async (items: User[]) => items);
    const service = new UserService(fakeModel({ createMany }));

    await service.createUsers([
      { name: "ada lovelace", email: "ada@x.com", password: "password123" },
      { name: "grace hopper", email: "grace@x.com", password: "password123" },
    ]);

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Ada Lovelace" }),
      expect.objectContaining({ name: "Grace Hopper" }),
    ]);
  });

  it("throws 404 when the user is missing", async () => {
    const service = new UserService(
      fakeModel({ getById: vi.fn(async () => null) }),
    );
    await expect(service.getUser("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("returns the user when found", async () => {
    const user = { id: "1", name: "Ada" } as User;
    const service = new UserService(
      fakeModel({ getById: vi.fn(async () => user) }),
    );
    await expect(service.getUser("1")).resolves.toBe(user);
  });
});
