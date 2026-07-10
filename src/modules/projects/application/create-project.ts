import { Project, ProjectSnapshot } from "../domain/project.js";
import { IProjectRepository } from "../domain/project.repository.js";
import { CreateProjectDto } from "../interface/project.dto.js";

export class CreateProject {
  constructor(private projects: IProjectRepository) {}

  async execute(
    ownerId: string,
    input: CreateProjectDto,
  ): Promise<ProjectSnapshot> {
    const project = Project.create({
      ownerId,
      name: input.name,
      deadline: input.deadline ? new Date(input.deadline) : null,
    });
    await this.projects.add(project);
    return project.toSnapshot();
  }
}
