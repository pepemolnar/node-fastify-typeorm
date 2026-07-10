import "reflect-metadata";
import { createLogger } from "./shared/infrastructure/logger.js";
import { startEmailWorker } from "./modules/notifications/infrastructure/email.worker.js";

const logger = createLogger();
const worker = startEmailWorker(logger);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, "worker shutting down");
    await worker.close();
    process.exit(0);
  });
}
