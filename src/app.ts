import Fastify from "fastify";
import { env } from "./config/env.config.js";
import { routes } from "./routes/index.js";
import { registerErrorHandler } from "./middlewares/errorHandler.js";

export async function createApp() {
  const app = Fastify({ logger: true });
  app.get("/", async () => env.GREETING);
  await app.register(routes);
  registerErrorHandler(app);
  return app;
}
