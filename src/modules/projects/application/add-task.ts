import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { ProjectSnapshot } from "../domain/project.js";
import { IProjectRepository } from "../domain/project.repository.js";
import { AddTaskDto } from "../interface/project.dto.js";

export class AddTask {
  constructor(private projects: IProjectRepository) {}

  async execute(
    projectId: string,
    input: AddTaskDto,
  ): Promise<ProjectSnapshot> {
    const project = await this.projects.findById(projectId);
    if (!project)
      throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");

    project.addTask(input.title);
    await this.projects.save(project);
    return project.toSnapshot();
  }
}
