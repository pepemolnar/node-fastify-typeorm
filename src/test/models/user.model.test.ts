import { describe, it, expect, vi } from "vitest";
import { UserModel } from "../../models/user.model.js";
import type { EntityManager, Repository } from "typeorm";
import type { User } from "../../entities/user.entity.js";

function fakeRepo(overrides: Partial<Repository<User>> = {}): Repository<User> {
  return {
    find: vi.fn(async () => []),
    findAndCount: vi.fn(async () => [[], 0]),
    findOne: vi.fn(async () => null),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => data),
    update: vi.fn(async () => ({})),
    ...overrides,
  } as unknown as Repository<User>;
}

// The model now depends on an EntityManager and pulls repos off it, so the
// fake manager just hands back one fake repository.
function fakeManager(repo: Repository<User>): EntityManager {
  return { getRepository: () => repo } as unknown as EntityManager;
}

describe("UserModel", () => {
  it("forces isDeleted=false and applies pagination in get()", async () => {
    const findAndCount = vi.fn(async () => [[], 0] as [User[], number]);
    await new UserModel(fakeManager(fakeRepo({ findAndCount }))).get(10, 5, {
      name: "ada",
    });
    expect(findAndCount).toHaveBeenCalledWith({
      where: { name: "ada", isDeleted: false },
      take: 10,
      skip: 5,
      order: { createdAt: "DESC" },
    });
  });

  it("softDelete sets isDeleted = true", async () => {
    const update = vi.fn(async () => ({}) as any);
    await new UserModel(fakeManager(fakeRepo({ update }))).softDelete("1");
    expect(update).toHaveBeenCalledWith("1", { isDeleted: true });
  });

  it("create rejects a duplicate email with 400", async () => {
    const existing = { id: "1", email: "ada@x.com" } as User;
    const model = new UserModel(
      fakeManager(fakeRepo({ findOne: vi.fn(async () => existing) })),
    );
    await expect(
      model.create({ name: "Ada", email: "ada@x.com" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
