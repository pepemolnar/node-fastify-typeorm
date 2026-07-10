import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { ProjectSnapshot } from "../domain/project.js";
import { IProjectRepository } from "../domain/project.repository.js";

export class GetProject {
  constructor(private projects: IProjectRepository) {}

  async execute(id: string): Promise<ProjectSnapshot> {
    const project = await this.projects.findById(id);
    if (!project)
      throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");
    return project.toSnapshot();
  }
}
