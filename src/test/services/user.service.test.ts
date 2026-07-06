import { describe, it, expect, vi } from "vitest";
import { UserService } from "../../services/user.service.js";
import type { IUserRepository } from "../../types/user.types.js";
import type { UnitOfWork } from "../../db/unit-of-work.js";
import type { User } from "../../entities/user.entity.js";

// One helper builds a fake repository; each test overrides only what it cares
// about. The service depends on IUserRepository, so no database is involved.
function fakeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    get: vi.fn(async () => ({ data: [], total: 0, limit: 20, offset: 0 })),
    getPage: vi.fn(async () => ({ data: [], nextCursor: null })),
    getById: vi.fn(async () => null),
    getForLogin: vi.fn(async () => null),
    create: vi.fn(async (data) => ({ id: "1", ...data }) as User),
    update: vi.fn(async () => null),
    softDelete: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as IUserRepository;
}

// The fake Unit of Work runs the work inline against the same repo — no real
// transaction, but it proves the service composes its calls through the UoW.
function makeService(repo: IUserRepository) {
  const uow: UnitOfWork = { run: (work) => work({ users: repo }) };
  return new UserService(repo, uow);
}

describe("UserService", () => {
  // Note: duplicate-email rejection now lives in UserModel.create (closest to
  // the DB), so it is covered in the model + integration suites, not here.
  it("capitalizes the name before handing it to the repository", async () => {
    const create = vi.fn(async (data) => data as User);
    const service = makeService(fakeRepo({ create }));

    await service.createUser({
      name: "ada lovelace",
      email: "ada@x.com",
      password: "password123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ada Lovelace" }),
    );
  });

  it("bulk create capitalizes each name and inserts through the Unit of Work", async () => {
    const create = vi.fn(async (data) => data as User);
    const repo = fakeRepo({ create });
    const run = vi.fn((work) => work({ users: repo }));
    const service = new UserService(repo, { run } as unknown as UnitOfWork);

    await service.createUsers([
      { name: "ada lovelace", email: "ada@x.com", password: "password123" },
      { name: "grace hopper", email: "grace@x.com", password: "password123" },
    ]);

    expect(run).toHaveBeenCalledOnce(); // one transaction for the whole batch
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "Ada Lovelace" }),
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: "Grace Hopper" }),
    );
  });

  it("throws 404 when the user is missing", async () => {
    const service = makeService(fakeRepo({ getById: vi.fn(async () => null) }));
    await expect(service.getUser("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("returns the user when found", async () => {
    const user = { id: "1", name: "Ada" } as User;
    const service = makeService(fakeRepo({ getById: vi.fn(async () => user) }));
    await expect(service.getUser("1")).resolves.toBe(user);
  });
});
