import { describe, it, expect, vi } from "vitest";
import { UserService } from "../../services/user.service.js";
import type { UserModel } from "../../models/user.model.js";
import type { User } from "../../entities/user.entity.js";

// One helper builds a fake model; each test overrides only what it cares about.
function fakeModel(overrides: Partial<UserModel> = {}): UserModel {
  return {
    getAll: vi.fn(async () => []),
    getBy: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    create: vi.fn(async (data) => ({ id: "1", ...data } as User)),
    update: vi.fn(async () => null),
    softDelete: vi.fn(async () => null),
    ...overrides,
  } as unknown as UserModel;
}

describe("UserService", () => {
  it("rejects a duplicate email with 400", async () => {
    const existing = { id: "1", email: "ada@x.com" } as User;
    const service = new UserService(fakeModel({ getBy: vi.fn(async () => [existing]) }));

    await expect(
      service.createUser({ name: "ada", email: "ada@x.com" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("capitalizes the name before handing it to the model", async () => {
    const create = vi.fn(async (data) => data as User);
    const service = new UserService(fakeModel({ create }));

    await service.createUser({ name: "ada lovelace", email: "ada@x.com" });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ada Lovelace" }),
    );
  });

  it("throws 404 when the user is missing", async () => {
    const service = new UserService(fakeModel({ getById: vi.fn(async () => null) }));
    await expect(service.getUser("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("returns the user when found", async () => {
    const user = { id: "1", name: "Ada" } as User;
    const service = new UserService(fakeModel({ getById: vi.fn(async () => user) }));
    await expect(service.getUser("1")).resolves.toBe(user);
  });
});
