import { randomUUID } from "node:crypto";
import { Entity } from "../../../shared/domain/entity.js";
import { HttpError } from "../../../shared/domain/errors/http-error.js";

export type TaskStatus = "open" | "done";

export interface TaskSnapshot {
  id: string;
  title: string;
  status: TaskStatus;
}

export class Task extends Entity<string> {
  private constructor(
    id: string,
    private props: { title: string; status: TaskStatus },
  ) {
    super(id);
  }

  static create(title: string): Task {
    return new Task(randomUUID(), {
      title: Task.normalizeTitle(title),
      status: "open",
    });
  }

  static reconstitute(props: {
    id: string;
    title: string;
    status: TaskStatus;
  }): Task {
    return new Task(props.id, { title: props.title, status: props.status });
  }

  complete(): void {
    this.props.status = "done";
  }

  get title(): string {
    return this.props.title;
  }
  get status(): TaskStatus {
    return this.props.status;
  }
  get isOpen(): boolean {
    return this.props.status === "open";
  }

  toSnapshot(): TaskSnapshot {
    return { id: this.id, title: this.title, status: this.status };
  }

  private static normalizeTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new HttpError(
        400,
        "Task title cannot be empty",
        "INVALID_TASK_TITLE",
      );
    }
    return trimmed;
  }
}
