import "reflect-metadata";
import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { AppDataSource } from "./db/data-source.js";

const app = await createApp();
await AppDataSource.initialize();
// Bind to 0.0.0.0 so the server is reachable through Docker's published port,
// not just the container's own loopback interface.
await app.listen({ port: env.PORT, host: "0.0.0.0" });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await AppDataSource.destroy();
    process.exit(0);
  });
}
