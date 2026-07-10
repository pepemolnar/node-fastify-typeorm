import { Worker } from "bullmq";
import type { Logger } from "pino";
import { QUEUE_NAME } from "../../../shared/infrastructure/jobs/bullmq.job-queue.js";
import { createQueueConnection } from "../../../shared/infrastructure/jobs/queue-connection.js";
import { EmailService } from "../application/email.service.js";
import { ConsoleEmailAdapter } from "./console-email.adapter.js";
import { SEND_EMAIL, SendEmailJob } from "../application/send-email.job.js";

export function startEmailWorker(logger: Logger): Worker {
  const emails = new EmailService(new ConsoleEmailAdapter(logger));

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case SEND_EMAIL: {
          const { to, template, context } = job.data as SendEmailJob;
          if (template === "welcome")
            await emails.sendWelcome(to, context.name);
          return;
        }
        default:
          logger.warn({ name: job.name }, "unknown job");
      }
    },
    { connection: createQueueConnection() },
  );

  worker.on("failed", (job, err) =>
    logger.error({ err, jobId: job?.id }, "job failed"),
  );

  return worker;
}
