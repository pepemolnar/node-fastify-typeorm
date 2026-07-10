import { DomainEvent } from "../../../../shared/domain/events/domain-event.js";

export interface TaskCompleted extends DomainEvent {
  type: "TaskCompleted";
  projectId: string;
  taskId: string;
  title: string;
  ownerId: string;
}
