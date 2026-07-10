import type { FastifyInstance } from "fastify";
import type { Container } from "../container.js";

export async function routes(app: FastifyInstance, container: Container) {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async (req, reply) => {
    try {
      await container.checkReadiness();
      return { status: "ready" };
    } catch (err) {
      req.log.warn({ err }, "readiness probe failed");
      return reply.code(503).send({ status: "not ready" });
    }
  });

  await app.register(
    async (v1) => {
      await v1.register(container.userRoutes.register, { prefix: "/users" });
      await v1.register(container.authRoutes.register, { prefix: "/auth" });
      await v1.register(container.projectRoutes.register, {
        prefix: "/projects",
      });
    },
    { prefix: "/v1" },
  );
}
