import { Project } from "../domain/project.js";
import { Task } from "../domain/task.js";
import { ProjectEntity } from "./project.entity.js";
import { TaskEntity } from "./task.entity.js";

export class ProjectMapper {
  static toEntity(project: Project): ProjectEntity {
    const row = new ProjectEntity();
    row.id = project.id;
    row.ownerId = project.ownerId;
    row.name = project.name;
    row.status = project.status;
    row.deadline = project.deadline;
    row.tasks = project.tasks.map((task) =>
      ProjectMapper.taskToEntity(task, project.id),
    );
    row.createdAt = project.createdAt;
    row.updatedAt = project.updatedAt;
    return row;
  }

  private static taskToEntity(task: Task, projectId: string): TaskEntity {
    const row = new TaskEntity();
    row.id = task.id;
    row.title = task.title;
    row.status = task.status;
    row.projectId = projectId;
    return row;
  }

  static toDomain(row: ProjectEntity): Project {
    return Project.reconstitute({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      status: row.status,
      deadline: row.deadline,
      tasks: (row.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
