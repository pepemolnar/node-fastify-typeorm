import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { ProjectRoutes } from "../../modules/projects/interface/project.routes.js";
import { authPlugin } from "../../modules/auth/infrastructure/auth.plugin.js";
import { registerErrorHandler } from "../../shared/interface/error-handler.js";
import type { ProjectController } from "../../modules/projects/interface/project.controller.js";

const OWNER = "11111111-1111-1111-1111-111111111111";

async function buildApp(controller: Partial<ProjectController>) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(authPlugin);
  registerErrorHandler(app);
  await app.register(
    new ProjectRoutes(controller as ProjectController).register,
    { prefix: "/projects" },
  );
  await app.ready();
  return app;
}

describe("project routes", () => {
  it("POST /projects rejects an unauthenticated request with 401", async () => {
    const createController = vi.fn();
    const app = await buildApp({ createController });

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Launch" },
    });

    expect(res.statusCode).toBe(401);
    expect(createController).not.toHaveBeenCalled();
  });

  it("POST /projects rejects a missing name with 400", async () => {
    const createController = vi.fn();
    const app = await buildApp({ createController });
    const token = app.jwt.sign({ sub: OWNER, role: "user", typ: "access" });

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(createController).not.toHaveBeenCalled();
  });

  it("POST /projects creates a project for the authenticated owner", async () => {
    const createController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.status(201).send({
          id: "p1",
          ownerId: OWNER,
          name: "Launch",
          status: "active",
          deadline: null,
          tasks: [],
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        }),
    );
    const app = await buildApp({ createController });
    const token = app.jwt.sign({ sub: OWNER, role: "user", typ: "access" });

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Launch" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      id: "p1",
      ownerId: OWNER,
      status: "active",
      tasks: [],
    });
  });
});
