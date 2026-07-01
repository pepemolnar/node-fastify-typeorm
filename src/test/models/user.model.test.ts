import { describe, it, expect, vi } from "vitest";
import { UserModel } from "../../models/user.model.js";
import type { Repository } from "typeorm";
import type { User } from "../../entities/user.entity.js";

function fakeRepo(overrides: Partial<Repository<User>> = {}): Repository<User> {
  return {
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => data),
    update: vi.fn(async () => ({})),
    ...overrides,
  } as unknown as Repository<User>;
}

describe("UserModel", () => {
  it("defaults isDeleted to false in getBy", async () => {
    const find = vi.fn(async () => []);
    await new UserModel(fakeRepo({ find })).getBy({ name: "ada" });
    expect(find).toHaveBeenCalledWith({ where: { name: "ada", isDeleted: false } });
  });

  it("softDelete sets isDeleted = true", async () => {
    const update = vi.fn(async () => ({}) as any);
    await new UserModel(fakeRepo({ update, findOne: vi.fn(async () => null) })).softDelete("1");
    expect(update).toHaveBeenCalledWith("1", { isDeleted: true });
  });
});
