import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";
import { makeTestDataSource } from "./test-data-source.js";
import { UserRepository } from "../../modules/users/infrastructure/user.repository.js";
import { User as UserEntity } from "../../modules/users/infrastructure/user.entity.js";
import { User } from "../../modules/users/domain/user.js";
import {
  decodeCursor,
  type Cursor,
} from "../../shared/infrastructure/pagination/cursor.js";
import { TypeOrmUnitOfWork } from "../../shared/infrastructure/persistence/unit-of-work.js";

let container: StartedPostgreSqlContainer;
let ds: DataSource;
let repo: UserRepository;

// Persist a fresh aggregate and hand it back so tests can reference its id.
async function addUser(name: string, email: string): Promise<User> {
  const user = await User.create({ name, email, password: "password123" });
  await repo.add(user);
  return user;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  ds = makeTestDataSource(container.getConnectionUri());
  await ds.initialize(); // <- the call the roadmap asks for
  await ds.runMigrations(); // <- schema built from your migration, not synchronize
  repo = new UserRepository(ds.manager);
});

afterEach(() => ds.getRepository(UserEntity).clear()); // TRUNCATE between tests
afterAll(async () => {
  await ds?.destroy();
  await container?.stop();
});

describe("UserRepository against real Postgres", () => {
  it("soft delete hides the row from reads", async () => {
    const u = await addUser("Ada", "ada@x.io");
    await repo.softDelete(u.id);
    const { data, total } = await repo.list(20, 0, {});
    expect(total).toBe(0);
    expect(data).toEqual([]);
  });

  it("paginates with take/skip and reports the full total", async () => {
    for (let i = 0; i < 5; i++) await addUser(`U${i}`, `u${i}@x.io`);
    const page = await repo.list(2, 2, {});
    expect(page.total).toBe(5);
    expect(page.data).toHaveLength(2);
  });

  // Proves the Unit of Work transaction actually rolls back: a duplicate email
  // mid-batch throws, and none of the batch is committed.
  it("Unit of Work rolls back the whole batch when one write fails", async () => {
    const uow = new TypeOrmUnitOfWork(ds);
    await expect(
      uow.run(async ({ users }) => {
        await users.add(
          await User.create({
            name: "A",
            email: "a@x.io",
            password: "password123",
          }),
        );
        await users.add(
          await User.create({
            name: "B",
            email: "b@x.io",
            password: "password123",
          }),
        );
        await users.add(
          await User.create({
            name: "A2",
            email: "a@x.io",
            password: "password123",
          }),
        ); // duplicate -> throws
      }),
    ).rejects.toThrow();
    const { total } = await repo.list(20, 0, {});
    expect(total).toBe(0); // nothing committed — atomicity proven
  });

  it("cursor pagination walks every row exactly once", async () => {
    const N = 7;
    for (let i = 0; i < N; i++) await addUser(`U${i}`, `c${i}@x.io`);

    const seen: string[] = [];
    let cursor: Cursor | undefined;
    for (let guard = 0; guard <= N; guard++) {
      const page = await repo.listByCursor(3, cursor); // pages of 3, 3, 1
      seen.push(...page.data.map((u) => u.id));
      if (!page.nextCursor) break;
      cursor = decodeCursor(page.nextCursor);
    }

    expect(seen).toHaveLength(N);
    expect(new Set(seen).size).toBe(N); // no row skipped, none repeated
  });

  it("cursor pagination excludes soft-deleted rows", async () => {
    const hidden = await addUser("Gone", "gone@x.io");
    await addUser("Kept", "kept@x.io");
    await repo.softDelete(hidden.id);

    const page = await repo.listByCursor(20);
    expect(page.data.map((u) => u.id)).not.toContain(hidden.id);
    expect(page.data).toHaveLength(1);
  });

  // The keyset payoff over offset: a row inserted mid-pagination can't cause the
  // next page to skip or repeat an original row.
  it("stays stable when a new row is inserted mid-pagination", async () => {
    for (let i = 0; i < 4; i++) await addUser(`s${i}`, `s${i}@x.io`);

    const first = await repo.listByCursor(2);
    const firstIds = first.data.map((u) => u.id);

    // A brand-new (newest) row lands after page 1 was read.
    await addUser("new", "new@x.io");

    const second = await repo.listByCursor(2, decodeCursor(first.nextCursor!));
    const secondIds = second.data.map((u) => u.id);

    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]); // no repeats
    // All 4 originals covered; the newer row sorts ahead of the cursor, so it's
    // correctly excluded from the older pages rather than shifting them.
    expect(new Set([...firstIds, ...secondIds]).size).toBe(4);
  });
});
