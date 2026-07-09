import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { AuthRoutes } from "../../routes/auth.routes.js";
import { authPlugin } from "../../extras/auth/auth.plugin.js";
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

  it("POST /auth/login returns an access + refresh token pair on success", async () => {
    const loginController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.send({ accessToken: "access.jwt", refreshToken: "refresh.jwt" }),
    );
    const app = await buildApp({ loginController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ada@x.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      accessToken: "access.jwt",
      refreshToken: "refresh.jwt",
    });
  });

  it("POST /auth/refresh rejects a missing refreshToken with 400", async () => {
    const refreshController = vi.fn();
    const app = await buildApp({ refreshController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(refreshController).not.toHaveBeenCalled();
  });

  it("POST /auth/refresh returns a rotated token pair on success", async () => {
    const refreshController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.send({ accessToken: "new.access", refreshToken: "new.refresh" }),
    );
    const app = await buildApp({ refreshController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "old.refresh" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      accessToken: "new.access",
      refreshToken: "new.refresh",
    });
  });

  it("POST /auth/logout returns 204", async () => {
    const logoutController = vi.fn(
      async (_req: FastifyRequest, reply: FastifyReply) =>
        reply.status(204).send(),
    );
    const app = await buildApp({ logoutController });

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: "some.refresh" },
    });

    expect(res.statusCode).toBe(204);
    expect(logoutController).toHaveBeenCalledOnce();
  });
});
