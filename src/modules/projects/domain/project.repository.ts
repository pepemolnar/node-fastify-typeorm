import { Project, ProjectStatus } from "./project.js";

export interface ProjectFilters {
  ownerId?: string;
  status?: ProjectStatus;
}

export interface OffsetPage {
  data: Project[];
  total: number;
}

export interface IProjectRepository {
  list(
    limit: number,
    offset: number,
    filters: ProjectFilters,
  ): Promise<OffsetPage>;
  findById(id: string): Promise<Project | null>;
  add(project: Project): Promise<void>;
  save(project: Project): Promise<void>;
}
