import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { UserRoutes } from "../../routes/user.routes.js";
import { registerErrorHandler } from "../../middlewares/errorHandler.js";
import type { UserController } from "../../controllers/user.controller.js";

const ID = "123e4567-e89b-12d3-a456-426614174000";

async function buildApp(controller: Partial<UserController>) {
  const app = Fastify();
  // Mirror the real app: teach Fastify to validate & serialize with Zod,
  // otherwise the route schemas are handed to the default AJV compiler.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const routes = new UserRoutes(controller as UserController);
  await app.register(routes.register, { prefix: "/users" });
  registerErrorHandler(app); // so thrown HttpErrors map to status codes
  return app;
}

describe("user routes", () => {
  it("GET /users/:id passes the id to the controller and returns 200", async () => {
    const getUserController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) =>
      reply.send({
        id: ID,
        name: "Ada",
        email: "ada@example.com",
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-01"),
      }),
    );
    const app = await buildApp({ getUserController });

    const res = await app.inject({ method: "GET", url: `/users/${ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: ID, name: "Ada" });
    expect(getUserController.mock.calls[0][0].params).toEqual({ id: ID });
  });

  it("GET /users/:id rejects a non-UUID id with 400 before the controller", async () => {
    const getUserController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) => reply.send({}));
    const app = await buildApp({ getUserController });

    const res = await app.inject({ method: "GET", url: "/users/not-a-uuid" });

    expect(res.statusCode).toBe(400);
    expect(getUserController).not.toHaveBeenCalled();
  });

  it("GET /users/:id strips fields not in the response schema (no isDeleted leak)", async () => {
    // The controller deliberately leaks isDeleted; the response schema must drop it.
    const getUserController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) =>
      reply.send({
        id: ID,
        name: "Ada",
        email: "ada@example.com",
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-01"),
        isDeleted: true,
        passwordHash: "super-secret",
      }),
    );
    const app = await buildApp({ getUserController });

    const res = await app.inject({ method: "GET", url: `/users/${ID}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).not.toHaveProperty("isDeleted");
    expect(body).not.toHaveProperty("passwordHash");
    expect(body).toMatchObject({
      id: ID,
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("DELETE /users/:id returns 204", async () => {
    const deleteUserController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) =>
      reply.status(204).send(),
    );
    const app = await buildApp({ deleteUserController });

    const res = await app.inject({ method: "DELETE", url: `/users/${ID}` });
    expect(res.statusCode).toBe(204);
  });

  it("POST /users rejects an invalid email with 400 before hitting the controller", async () => {
    const createUserController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) =>
      reply.status(201).send({}),
    );
    const app = await buildApp({ createUserController });

    const res = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "ada", email: "nope" },
    });

    expect(res.statusCode).toBe(400);
    expect(createUserController).not.toHaveBeenCalled();
  });

  it("GET /users rejects an unknown query field with 400 (strict allow-list)", async () => {
    const getUsersController = vi.fn(async (_req: FastifyRequest, reply: FastifyReply) => reply.send([]));
    const app = await buildApp({ getUsersController });

    // isDeleted is not in userQuerySchema, and the schema is .strict()
    const res = await app.inject({
      method: "GET",
      url: "/users?isDeleted=true",
    });

    expect(res.statusCode).toBe(400);
    expect(getUsersController).not.toHaveBeenCalled();
  });
});
