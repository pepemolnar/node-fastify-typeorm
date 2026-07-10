import { EntityManager, FindOptionsWhere } from "typeorm";
import { Project } from "../domain/project.js";
import {
  IProjectRepository,
  OffsetPage,
  ProjectFilters,
} from "../domain/project.repository.js";
import { ProjectEntity } from "./project.entity.js";
import { ProjectMapper } from "./project.mapper.js";

export class ProjectRepository implements IProjectRepository {
  constructor(private manager: EntityManager) {}

  private repo() {
    return this.manager.getRepository(ProjectEntity);
  }

  async list(
    limit: number,
    offset: number,
    filters: ProjectFilters,
  ): Promise<OffsetPage> {
    const where: FindOptionsWhere<ProjectEntity> = {};
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.status) where.status = filters.status;

    const [rows, total] = await this.repo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
      relations: { tasks: true },
    });
    return { data: rows.map((row) => ProjectMapper.toDomain(row)), total };
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.repo().findOne({
      where: { id },
      relations: { tasks: true },
    });
    return row ? ProjectMapper.toDomain(row) : null;
  }

  async add(project: Project): Promise<void> {
    await this.repo().save(ProjectMapper.toEntity(project));
  }

  async save(project: Project): Promise<void> {
    await this.repo().save(ProjectMapper.toEntity(project));
  }
}
