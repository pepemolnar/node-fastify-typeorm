import { ProjectSnapshot } from "../domain/project.js";
import {
  IProjectRepository,
  ProjectFilters,
} from "../domain/project.repository.js";

export interface PaginatedProjects {
  data: ProjectSnapshot[];
  total: number;
  limit: number;
  offset: number;
}

export class ListProjects {
  constructor(private projects: IProjectRepository) {}

  async execute(
    limit: number,
    offset: number,
    filters: ProjectFilters,
  ): Promise<PaginatedProjects> {
    const { data, total } = await this.projects.list(limit, offset, filters);
    return {
      data: data.map((project) => project.toSnapshot()),
      total,
      limit,
      offset,
    };
  }
}
