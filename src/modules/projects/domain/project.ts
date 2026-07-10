import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";
import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { Task, TaskSnapshot } from "./task.js";
import { TaskCompleted } from "./events/task-completed.js";

export type ProjectStatus = "active" | "archived";

export interface ProjectSnapshot {
  id: string;
  ownerId: string;
  name: string;
  status: ProjectStatus;
  deadline: string | null;
  tasks: TaskSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectProps {
  ownerId: string;
  name: string;
  status: ProjectStatus;
  deadline: Date | null;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends AggregateRoot<string, TaskCompleted> {
  private constructor(
    id: string,
    private props: ProjectProps,
  ) {
    super(id);
  }

  static create(input: {
    ownerId: string;
    name: string;
    deadline?: Date | null;
  }): Project {
    const now = new Date();
    const deadline = input.deadline ?? null;
    Project.assertDeadlineNotPast(deadline, now);

    return new Project(randomUUID(), {
      ownerId: input.ownerId,
      name: input.name.trim(),
      status: "active",
      deadline,
      tasks: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: {
    id: string;
    ownerId: string;
    name: string;
    status: ProjectStatus;
    deadline: Date | null;
    tasks: { id: string; title: string; status: "open" | "done" }[];
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    return new Project(props.id, {
      ownerId: props.ownerId,
      name: props.name,
      status: props.status,
      deadline: props.deadline,
      tasks: props.tasks.map((t) => Task.reconstitute(t)),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  addTask(title: string): Task {
    this.assertActive();
    const task = Task.create(title);
    this.props.tasks.push(task);
    this.touch();
    return task;
  }

  completeTask(taskId: string): void {
    this.assertActive();
    const task = this.props.tasks.find((t) => t.id === taskId);
    if (!task) throw new HttpError(404, "Task not found", "TASK_NOT_FOUND");
    if (!task.isOpen) return;

    task.complete();
    this.touch();

    const event: TaskCompleted = {
      type: "TaskCompleted",
      projectId: this.id,
      taskId: task.id,
      title: task.title,
      ownerId: this.props.ownerId,
      occurredAt: new Date(),
    };
    this.addDomainEvent(event);
  }

  archive(): void {
    this.assertActive();
    if (this.hasOpenTasks()) {
      throw new HttpError(
        409,
        "Cannot archive a project with open tasks",
        "PROJECT_HAS_OPEN_TASKS",
      );
    }
    this.props.status = "archived";
    this.touch();
  }

  changeDeadline(deadline: Date | null): void {
    Project.assertDeadlineNotPast(deadline, new Date());
    this.props.deadline = deadline;
    this.touch();
  }

  get ownerId(): string {
    return this.props.ownerId;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): ProjectStatus {
    return this.props.status;
  }
  get deadline(): Date | null {
    return this.props.deadline;
  }
  get tasks(): readonly Task[] {
    return this.props.tasks;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toSnapshot(): ProjectSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      status: this.status,
      deadline: this.props.deadline ? this.props.deadline.toISOString() : null,
      tasks: this.props.tasks.map((t) => t.toSnapshot()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private hasOpenTasks(): boolean {
    return this.props.tasks.some((t) => t.isOpen);
  }

  private assertActive(): void {
    if (this.props.status !== "active") {
      throw new HttpError(409, "Project is archived", "PROJECT_ARCHIVED");
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  private static assertDeadlineNotPast(deadline: Date | null, now: Date): void {
    if (deadline && deadline.getTime() < now.getTime()) {
      throw new HttpError(
        400,
        "Deadline cannot be in the past",
        "DEADLINE_IN_PAST",
      );
    }
  }
}
