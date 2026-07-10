import "reflect-metadata";
import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { createLogger } from "./shared/infrastructure/logger.js";
import { AppDataSource } from "./shared/infrastructure/persistence/data-source.js";
import { createContainer } from "./container.js";

await AppDataSource.initialize();
const logger = createLogger();
const container = createContainer(logger);
const app = await createApp(container, logger);

await app.listen({ port: env.PORT, host: "0.0.0.0" });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(signal));
}

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return; // guard: ignore a second SIGTERM
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");

  // Hard cap: if drain hangs, force-exit so a deploy can't wedge.
  const forceExit = setTimeout(() => {
    app.log.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await app.close(); // stop accepting, drain in-flight requests
    await AppDataSource.destroy(); // then close the DB pool
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "error during shutdown");
    process.exit(1);
  }
}
