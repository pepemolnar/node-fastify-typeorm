import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";
import { makeTestDataSource } from "./test-data-source.js";
import { UserModel } from "../../models/user.model.js";
import { User } from "../../entities/user.entity.js";

let container: StartedPostgreSqlContainer;
let ds: DataSource;
let model: UserModel;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  ds = makeTestDataSource(container.getConnectionUri());
  await ds.initialize(); // <- the call the roadmap asks for
  await ds.runMigrations(); // <- schema built from your migration, not synchronize
  model = new UserModel(ds.manager);
});

afterEach(() => ds.getRepository(User).clear()); // TRUNCATE between tests
afterAll(async () => {
  await ds?.destroy();
  await container?.stop();
});

describe("UserModel against real Postgres", () => {
  it("soft delete hides the row from reads", async () => {
    const u = await model.create({
      name: "Ada",
      email: "ada@x.io",
      passwordHash: "hashed",
    });
    await model.softDelete(u.id);
    const { data, total } = await model.get(20, 0, {});
    expect(total).toBe(0);
    expect(data).toEqual([]);
  });

  it("paginates with take/skip and reports the full total", async () => {
    for (let i = 0; i < 5; i++)
      await model.create({
        name: `U${i}`,
        email: `u${i}@x.io`,
        passwordHash: "hashed",
      });
    const page = await model.get(2, 2, {});
    expect(page.total).toBe(5);
    expect(page.data).toHaveLength(2);
  });

  // the 5.2 payoff: proves the transaction actually rolls back
  it("createMany rolls back the whole batch on a duplicate email", async () => {
    await expect(
      model.createMany([
        { name: "A", email: "a@x.io", passwordHash: "hashed" },
        { name: "B", email: "b@x.io", passwordHash: "hashed" },
        { name: "A2", email: "a@x.io", passwordHash: "hashed" }, // duplicate -> throws mid-batch
      ]),
    ).rejects.toThrow();
    const { total } = await model.get(20, 0, {});
    expect(total).toBe(0); // nothing committed — atomicity proven
  });
});
