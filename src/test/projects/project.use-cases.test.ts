import { describe, it, expect, vi } from "vitest";
import type { IProjectRepository } from "../../modules/projects/domain/project.repository.js";
import type { EventBus } from "../../shared/domain/events/event-bus.js";
import { Project } from "../../modules/projects/domain/project.js";
import { CreateProject } from "../../modules/projects/application/create-project.js";
import { CompleteTask } from "../../modules/projects/application/complete-task.js";

const OWNER = "11111111-1111-1111-1111-111111111111";

function fakeRepo(
  overrides: Partial<IProjectRepository> = {},
): IProjectRepository {
  return {
    list: vi.fn(async () => ({ data: [], total: 0 })),
    findById: vi.fn(async () => null),
    add: vi.fn(async () => {}),
    save: vi.fn(async () => {}),
    ...overrides,
  };
}

function fakeEvents(): EventBus {
  return {
    publish: vi.fn(async () => {}),
    subscribe: vi.fn(),
  } as unknown as EventBus;
}

describe("project use cases", () => {
  it("CreateProject stamps the authenticated owner id onto the project", async () => {
    const add = vi.fn(async () => {});
    const useCase = new CreateProject(fakeRepo({ add }));

    const snapshot = await useCase.execute(OWNER, { name: "Launch" });

    expect(snapshot.ownerId).toBe(OWNER);
    expect(add).toHaveBeenCalledOnce();
  });

  it("CompleteTask persists the aggregate and publishes TaskCompleted", async () => {
    const project = Project.create({ ownerId: OWNER, name: "Launch" });
    const task = project.addTask("Ship it");
    const save = vi.fn(async () => {});
    const events = fakeEvents();
    const useCase = new CompleteTask(
      fakeRepo({ findById: vi.fn(async () => project), save }),
      events,
    );

    await useCase.execute(project.id, task.id);

    expect(save).toHaveBeenCalledOnce();
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TaskCompleted", taskId: task.id }),
    );
  });

  it("CompleteTask throws 404 for an unknown project", async () => {
    const useCase = new CompleteTask(
      fakeRepo({ findById: vi.fn(async () => null) }),
      fakeEvents(),
    );
    await expect(useCase.execute("missing", "t1")).rejects.toMatchObject({
      status: 404,
    });
  });
});
