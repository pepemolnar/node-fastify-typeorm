import { describe, it, expect, vi } from "vitest";
import { LessThan } from "typeorm";
import type { EntityManager, Repository, UpdateResult } from "typeorm";
import { UserRepository } from "../../modules/users/infrastructure/user.repository.js";
import { User as UserEntity } from "../../modules/users/infrastructure/user.entity.js";
import { User } from "../../modules/users/domain/user.js";
import { decodeCursor } from "../../shared/infrastructure/pagination/cursor.js";

// Reads reconstitute a full aggregate, so the repository always selects every
// column (including the otherwise `select: false` password hash).
const FULL_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
};

// A complete persistence row — a valid email/hash so the mapper can rebuild an
// aggregate from it.
function row(id: string, createdAt: Date): UserEntity {
  return {
    id,
    name: `User ${id}`,
    email: `${id}@x.io`,
    role: "user",
    passwordHash: "hashed",
    createdAt,
    updatedAt: createdAt,
    isDeleted: false,
  } as UserEntity;
}

function fakeRepo(
  overrides: Partial<Repository<UserEntity>> = {},
): Repository<UserEntity> {
  return {
    find: vi.fn(async () => []),
    findAndCount: vi.fn(async () => [[], 0]),
    findOne: vi.fn(async () => null),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => data),
    update: vi.fn(async () => ({})),
    ...overrides,
  } as unknown as Repository<UserEntity>;
}

// The repository depends on an EntityManager and pulls repos off it, so the
// fake manager just hands back one fake repository.
function fakeManager(repo: Repository<UserEntity>): EntityManager {
  return { getRepository: () => repo } as unknown as EntityManager;
}

describe("UserRepository", () => {
  it("list forces isDeleted=false, paginates, and selects the full row", async () => {
    const findAndCount = vi.fn(async () => [[], 0] as [UserEntity[], number]);
    await new UserRepository(fakeManager(fakeRepo({ findAndCount }))).list(
      10,
      5,
      { name: "ada" },
    );
    expect(findAndCount).toHaveBeenCalledWith({
      where: { name: "ada", isDeleted: false },
      take: 10,
      skip: 5,
      order: { createdAt: "DESC" },
      select: FULL_SELECT,
    });
  });

  it("listByCursor first page scopes soft-deletes, sorts by (createdAt,id) DESC, over-fetches by one", async () => {
    const find = vi.fn(async () => [] as UserEntity[]);
    await new UserRepository(fakeManager(fakeRepo({ find }))).listByCursor(10);
    expect(find).toHaveBeenCalledWith({
      where: { isDeleted: false },
      order: { createdAt: "DESC", id: "DESC" },
      take: 11,
      select: FULL_SELECT,
    });
  });

  it("listByCursor with a cursor matches rows strictly after the keyset", async () => {
    const find = vi.fn(async () => [] as UserEntity[]);
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    await new UserRepository(fakeManager(fakeRepo({ find }))).listByCursor(10, {
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

  it("listByCursor returns domain aggregates and no next cursor when the page isn't full", async () => {
    const rows = [
      row("1", new Date("2026-01-02T00:00:00Z")),
      row("2", new Date("2026-01-01T00:00:00Z")),
    ];
    const page = await new UserRepository(
      fakeManager(fakeRepo({ find: async () => rows })),
    ).listByCursor(2);
    expect(page.data).toHaveLength(2);
    expect(page.data[0]).toBeInstanceOf(User);
    expect(page.nextCursor).toBeNull();
  });

  it("listByCursor trims the over-fetched row and points nextCursor at the last kept row", async () => {
    const rows = [
      row("1", new Date("2026-01-03T00:00:00Z")),
      row("2", new Date("2026-01-02T00:00:00Z")),
      row("3", new Date("2026-01-01T00:00:00Z")), // the +1 over-fetch
    ];
    const page = await new UserRepository(
      fakeManager(fakeRepo({ find: async () => rows })),
    ).listByCursor(2);
    expect(page.data.map((u) => u.id)).toEqual(["1", "2"]);
    expect(decodeCursor(page.nextCursor!).id).toBe("2"); // last kept row, not "3"
  });

  it("softDelete sets isDeleted = true", async () => {
    const update = vi.fn(async () => ({}) as UpdateResult);
    await new UserRepository(fakeManager(fakeRepo({ update }))).softDelete("1");
    expect(update).toHaveBeenCalledWith("1", { isDeleted: true });
  });

  it("add rejects a duplicate email with 409", async () => {
    const existing = row("1", new Date());
    const repo = new UserRepository(
      fakeManager(fakeRepo({ findOne: vi.fn(async () => existing) })),
    );
    const user = await User.create({
      name: "Ada",
      email: "ada@x.com",
      password: "password123",
    });
    await expect(repo.add(user)).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });
  });
});
