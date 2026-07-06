import { describe, it, expect, vi } from "vitest";
import { UserModel } from "../../models/user.model.js";
import { LessThan } from "typeorm";
import type { EntityManager, Repository, UpdateResult } from "typeorm";
import type { User } from "../../entities/user.entity.js";
import { decodeCursor } from "../../helpers/cursor.helper.js";

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

  it("getPage: first page scopes soft-deletes, sorts by (createdAt,id) DESC, over-fetches by one", async () => {
    const find = vi.fn(async () => [] as User[]);
    await new UserModel(fakeManager(fakeRepo({ find }))).getPage(10);
    expect(find).toHaveBeenCalledWith({
      where: { isDeleted: false },
      order: { createdAt: "DESC", id: "DESC" },
      take: 11,
    });
  });

  it("getPage: with a cursor, matches rows strictly after the keyset", async () => {
    const find = vi.fn(async () => [] as User[]);
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    await new UserModel(fakeManager(fakeRepo({ find }))).getPage(10, {
      createdAt,
      id: "mid",
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { createdAt: LessThan(createdAt), isDeleted: false },
          { createdAt, id: LessThan("mid"), isDeleted: false },
        ],
      }),
    );
  });

  it("getPage: no next cursor when the page isn't full", async () => {
    const rows = [
      { id: "1", createdAt: new Date("2026-01-02T00:00:00Z") },
      { id: "2", createdAt: new Date("2026-01-01T00:00:00Z") },
    ] as User[];
    const model = new UserModel(
      fakeManager(fakeRepo({ find: async () => rows })),
    );
    const page = await model.getPage(2);
    expect(page.data).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("getPage: trims the over-fetched row and points nextCursor at the last kept row", async () => {
    const rows = [
      { id: "1", createdAt: new Date("2026-01-03T00:00:00Z") },
      { id: "2", createdAt: new Date("2026-01-02T00:00:00Z") },
      { id: "3", createdAt: new Date("2026-01-01T00:00:00Z") }, // the +1 over-fetch
    ] as User[];
    const model = new UserModel(
      fakeManager(fakeRepo({ find: async () => rows })),
    );
    const page = await model.getPage(2);
    expect(page.data.map((u) => u.id)).toEqual(["1", "2"]);
    const decoded = decodeCursor(page.nextCursor!);
    expect(decoded.id).toBe("2"); // last kept row, not the over-fetched "3"
  });

  it("softDelete sets isDeleted = true", async () => {
    const update = vi.fn(async () => ({}) as UpdateResult);
    await new UserModel(fakeManager(fakeRepo({ update }))).softDelete("1");
    expect(update).toHaveBeenCalledWith("1", { isDeleted: true });
  });

  it("create rejects a duplicate email with 400", async () => {
    const existing = { id: "1", email: "ada@x.com" } as User;
    const model = new UserModel(
      fakeManager(fakeRepo({ findOne: vi.fn(async () => existing) })),
    );
    await expect(
      model.create({ name: "Ada", email: "ada@x.com", passwordHash: "hashed" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
