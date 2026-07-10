import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { EventBus } from "../../../shared/domain/events/event-bus.js";
import { ProjectSnapshot } from "../domain/project.js";
import { IProjectRepository } from "../domain/project.repository.js";

export class CompleteTask {
  constructor(
    private projects: IProjectRepository,
    private events: EventBus,
  ) {}

  async execute(projectId: string, taskId: string): Promise<ProjectSnapshot> {
    const project = await this.projects.findById(projectId);
    if (!project)
      throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");

    project.completeTask(taskId);
    await this.projects.save(project);

    for (const event of project.pullDomainEvents()) {
      await this.events.publish(event);
    }
    return project.toSnapshot();
  }
}
