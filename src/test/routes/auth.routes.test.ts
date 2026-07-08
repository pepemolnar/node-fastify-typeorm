import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { AuthRoutes } from "../../routes/auth.routes.js";
import { authPlugin } from "../../extras/auth.plugin.js";
import { registerErrorHandler } from "../../middlewares/errorHandler.js";
import type { AuthController } from "../../controllers/auth.controller.js";

async function buildApp(controller: Partial<AuthController>) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(authPlugin);
  const routes = new AuthRoutes(controller as AuthController);
  await app.register(routes.register, { prefix: "/auth" });
  registerErrorHandler(app);
  await app.ready();
  return app;
}

describe("auth routes", () => {
  it("POST /auth/register rejects a short password with 400", async () => {
    const registerController = vi.fn();
    const app = await buildApp({ registerController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "Ada", email: "ada@x.com", password: "short" },
    });

    expect(res.statusCode).toBe(400);
    expect(registerController).not.toHaveBeenCalled();
  });

  it("POST /auth/register returns 201 and never leaks the hash", async () => {
    const registerController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.status(201).send({
          id: "1",
          name: "Ada",
          email: "ada@x.com",
          createdAt: new Date("2020-01-01"),
          updatedAt: new Date("2020-01-01"),
          passwordHash: "super-secret",
        }),
    );
    const app = await buildApp({ registerController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "Ada", email: "ada@x.com", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: "1", email: "ada@x.com" });
    expect(res.json()).not.toHaveProperty("passwordHash");
  });

  it("POST /auth/login rejects an invalid email with 400", async () => {
    const loginController = vi.fn();
    const app = await buildApp({ loginController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nope", password: "password123" },
    });

    expect(res.statusCode).toBe(400);
    expect(loginController).not.toHaveBeenCalled();
  });

  it("POST /auth/login returns a token on success", async () => {
    const loginController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.send({ token: "signed.jwt.token" }),
    );
    const app = await buildApp({ loginController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ada@x.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ token: "signed.jwt.token" });
  });
});
