import { EventBus } from "../../../shared/domain/events/event-bus.js";
import { TaskCompleted } from "../../projects/domain/events/task-completed.js";
import { NotificationService } from "./notification.service.js";

export function registerTaskCompletedHandlers(
  events: EventBus,
  deps: { notifications: NotificationService },
): void {
  events.subscribe<TaskCompleted>("TaskCompleted", async (event) => {
    await deps.notifications.notify(
      "log",
      event.ownerId,
      `Task completed: ${event.title}`,
    );
  });
}
