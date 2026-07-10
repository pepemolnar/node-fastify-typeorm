import { describe, it, expect, vi } from "vitest";
import type { IUserRepository } from "../../modules/users/domain/user.repository.js";
import type {
  Repositories,
  UnitOfWork,
} from "../../shared/infrastructure/persistence/unit-of-work.js";
import { InMemoryCache } from "../../shared/infrastructure/cache/in-memory.cache.js";
import { CreateUser } from "../../modules/users/application/create-user.js";
import { CreateUsersBulk } from "../../modules/users/application/create-users-bulk.js";
import { GetUser } from "../../modules/users/application/get-user.js";
import { User } from "../../modules/users/domain/user.js";

// One helper builds a fake repository speaking the domain's IUserRepository —
// it stores/returns aggregates, so no database is involved.
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

describe("user use cases", () => {
  it("CreateUser normalizes the name before persisting the aggregate", async () => {
    const add = vi.fn(async (_user: User) => {});
    const useCase = new CreateUser(fakeRepo({ add }));

    await useCase.execute({
      name: "ada lovelace",
      email: "ada@x.com",
      password: "password123",
    });

    const user = add.mock.calls[0][0] as User;
    expect(user.name).toBe("Ada Lovelace");
  });

  it("CreateUser stores a bcrypt hash, never the raw password", async () => {
    const add = vi.fn(async (_user: User) => {});
    const useCase = new CreateUser(fakeRepo({ add }));

    await useCase.execute({
      name: "ada",
      email: "ada@x.com",
      password: "password123",
    });

    const user = add.mock.calls[0][0] as User;
    expect(user.passwordHash).not.toBe("password123");
    expect(await user.verifyPassword("password123")).toBe(true);
  });

  it("CreateUsersBulk normalizes each name and inserts through the Unit of Work", async () => {
    const add = vi.fn(async (_user: User) => {});
    const repo = fakeRepo({ add });
    const run = vi.fn((work: (r: Repositories) => Promise<unknown>) =>
      work({ users: repo }),
    );
    const useCase = new CreateUsersBulk({ run } as unknown as UnitOfWork);

    await useCase.execute([
      { name: "ada lovelace", email: "ada@x.com", password: "password123" },
      { name: "grace hopper", email: "grace@x.com", password: "password123" },
    ]);

    expect(run).toHaveBeenCalledOnce(); // one transaction for the whole batch
    expect((add.mock.calls[0][0] as User).name).toBe("Ada Lovelace");
    expect((add.mock.calls[1][0] as User).name).toBe("Grace Hopper");
  });

  it("GetUser throws 404 when the user is missing", async () => {
    const useCase = new GetUser(
      fakeRepo({ findById: vi.fn(async () => null) }),
      new InMemoryCache(),
    );
    await expect(useCase.execute("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("GetUser returns a snapshot without the password hash when found", async () => {
    const user = await User.create({
      name: "Ada",
      email: "ada@x.com",
      password: "password123",
    });
    const useCase = new GetUser(
      fakeRepo({ findById: vi.fn(async () => user) }),
      new InMemoryCache(),
    );

    const result = await useCase.execute(user.id);

    expect(result).toMatchObject({
      id: user.id,
      name: "Ada",
      email: "ada@x.com",
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
