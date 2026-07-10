import { describe, it, expect } from "vitest";
import { Project } from "../../modules/projects/domain/project.js";
import type { TaskCompleted } from "../../modules/projects/domain/events/task-completed.js";

const OWNER = "11111111-1111-1111-1111-111111111111";
const future = () => new Date(Date.now() + 86_400_000);
const past = () => new Date(Date.now() - 86_400_000);

describe("Project aggregate", () => {
  it("rejects a deadline in the past", () => {
    expect(() =>
      Project.create({ ownerId: OWNER, name: "Launch", deadline: past() }),
    ).toThrowError(
      expect.objectContaining({ status: 400, code: "DEADLINE_IN_PAST" }),
    );
  });

  it("creates an active project that references its owner by id only", () => {
    const project = Project.create({
      ownerId: OWNER,
      name: "Launch",
      deadline: future(),
    });
    expect(project.ownerId).toBe(OWNER);
    expect(project.status).toBe("active");
    expect(project.tasks).toHaveLength(0);
  });

  it("adds open tasks to an active project", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Write copy");
    expect(task.status).toBe("open");
    expect(project.tasks.map((t) => t.title)).toEqual(["Write copy"]);
  });

  it("records a TaskCompleted event when a task is completed", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Write copy");

    project.completeTask(task.id);

    expect(project.tasks[0].status).toBe("done");
    const events = project.pullDomainEvents() as TaskCompleted[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "TaskCompleted",
      taskId: task.id,
      title: "Write copy",
      ownerId: OWNER,
    });
    expect(project.pullDomainEvents()).toHaveLength(0); // drained
  });

  it("completing an unknown task throws 404", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    expect(() => project.completeTask("nope")).toThrowError(
      expect.objectContaining({ status: 404, code: "TASK_NOT_FOUND" }),
    );
  });

  it("cannot be archived while it has open tasks", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    project.addTask("Write copy");
    expect(() => project.archive()).toThrowError(
      expect.objectContaining({ status: 409, code: "PROJECT_HAS_OPEN_TASKS" }),
    );
    expect(project.status).toBe("active");
  });

  it("archives once every task is done", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Write copy");
    project.completeTask(task.id);
    project.archive();
    expect(project.status).toBe("archived");
  });

  it("refuses to add tasks to an archived project", () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    project.archive(); // no open tasks → allowed
    expect(() => project.addTask("late")).toThrowError(
      expect.objectContaining({ status: 409, code: "PROJECT_ARCHIVED" }),
    );
  });
});
