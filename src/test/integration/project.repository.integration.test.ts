import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";
import { makeTestDataSource } from "./test-data-source.js";
import { ProjectRepository } from "../../modules/projects/infrastructure/project.repository.js";
import { ProjectEntity } from "../../modules/projects/infrastructure/project.entity.js";
import { TaskEntity } from "../../modules/projects/infrastructure/task.entity.js";
import { Project } from "../../modules/projects/domain/project.js";

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

let container: StartedPostgreSqlContainer;
let ds: DataSource;
let repo: ProjectRepository;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  ds = makeTestDataSource(container.getConnectionUri());
  await ds.initialize();
  await ds.runMigrations(); // schema built from the Projects migration
  repo = new ProjectRepository(ds.manager);
});

afterEach(async () => {
  // TRUNCATE both together with CASCADE — a plain TRUNCATE of "projects" is
  // rejected while "tasks" holds a FK to it.
  await ds.query('TRUNCATE TABLE "projects", "tasks" CASCADE');
});
afterAll(async () => {
  await ds?.destroy();
  await container?.stop();
});

describe("ProjectRepository against real Postgres", () => {
  it("persists a project together with its tasks and reloads the whole aggregate", async () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    project.addTask("Write copy");
    project.addTask("Ship it");
    await repo.add(project);

    const loaded = await repo.findById(project.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.ownerId).toBe(OWNER);
    expect(loaded!.status).toBe("active");
    expect(loaded!.tasks.map((t) => t.title).sort()).toEqual([
      "Ship it",
      "Write copy",
    ]);
    expect(loaded!.tasks.every((t) => t.status === "open")).toBe(true);
  });

  it("completing a task is persisted and visible on reload", async () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Ship it");
    await repo.add(project);

    const loaded = await repo.findById(project.id);
    loaded!.completeTask(task.id);
    await repo.save(loaded!);

    const again = await repo.findById(project.id);
    const reloadedTask = again!.tasks.find((t) => t.id === task.id);
    expect(reloadedTask?.status).toBe("done");
  });

  it("archives a project once its tasks are done, and it survives a reload", async () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Ship it");
    project.completeTask(task.id);
    project.archive();
    await repo.add(project);

    const loaded = await repo.findById(project.id);
    expect(loaded!.status).toBe("archived");
  });

  it("lists only the owner's projects", async () => {
    await repo.add(Project.create({ ownerId: OWNER, name: "Mine A" }));
    await repo.add(Project.create({ ownerId: OWNER, name: "Mine B" }));
    await repo.add(Project.create({ ownerId: OTHER, name: "Theirs" }));

    const { data, total } = await repo.list(20, 0, { ownerId: OWNER });
    expect(total).toBe(2);
    expect(data.every((p) => p.ownerId === OWNER)).toBe(true);
  });

  it("cascade-deletes a project's tasks with the project (FK ON DELETE CASCADE)", async () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    project.addTask("Write copy");
    await repo.add(project);

    await ds.getRepository(ProjectEntity).delete({ id: project.id });

    const orphans = await ds
      .getRepository(TaskEntity)
      .count({ where: { projectId: project.id } });
    expect(orphans).toBe(0);
  });
});
