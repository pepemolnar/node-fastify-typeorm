import "reflect-metadata";
import { Worker } from "bullmq";
import { createLogger } from "./extras/logger.js";
import { createQueueConnection } from "./extras/jobs/connection.js";
import { QUEUE_NAME } from "./extras/adapters/bullmq.adapter.js";
import { SEND_EMAIL, SendEmailJob } from "./types/job.types.js";
import { EmailService } from "./services/email.service.js";
import { ConsoleEmailAdapter } from "./extras/adapters/console-email.adapter.js";

const logger = createLogger();
const emails = new EmailService(new ConsoleEmailAdapter(logger));

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case SEND_EMAIL: {
        const { to, template, context } = job.data as SendEmailJob;
        if (template === "welcome") await emails.sendWelcome(to, context.name);
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

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, "worker shutting down");
    await worker.close(); // stop pulling jobs, finish the in-flight one
    process.exit(0);
  });
}
