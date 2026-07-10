import { EventBus } from "../../../shared/domain/events/event-bus.js";
import { JobQueue } from "../../../shared/infrastructure/jobs/job-queue.port.js";
import { UserRegistered } from "../../users/domain/events/user-registered.js";
import { NotificationService } from "./notification.service.js";
import { SEND_EMAIL, SendEmailJob } from "./send-email.job.js";

export function registerUserRegisteredHandlers(
  events: EventBus,
  deps: { jobs: JobQueue; notifications: NotificationService },
): void {
  events.subscribe<UserRegistered>("UserRegistered", async (event) => {
    await deps.jobs.enqueue(SEND_EMAIL, {
      to: event.email,
      template: "welcome",
      context: { name: event.name },
    } satisfies SendEmailJob);
  });

  events.subscribe<UserRegistered>("UserRegistered", async (event) => {
    await deps.notifications.notify("log", event.email, "Welcome!");
  });
}
