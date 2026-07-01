import type { FastifyInstance } from "fastify";
import { UserRoutes } from "./user.routes.js";

export async function routes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
  await app.register(new UserRoutes().register, { prefix: "/users" });
}
