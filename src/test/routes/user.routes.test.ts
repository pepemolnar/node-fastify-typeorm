import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { UserRoutes } from "../../routes/user.routes.js";
import { registerErrorHandler } from "../../middlewares/errorHandler.js";
import type { UserController } from "../../controllers/user.controller.js";

async function buildApp(controller: UserController) {
  const app = Fastify();
  const routes = new UserRoutes(controller);
  await app.register(routes.register, { prefix: "/users" });
  registerErrorHandler(app);          // so thrown HttpErrors map to status codes
  return app;
}

describe("user routes", () => {
  it("GET /users/:id passes the id to the controller and returns 200", async () => {
    const getUserController = vi.fn(async (_req, reply) => reply.send({ id: "42" }));
    const app = await buildApp({ getUserController } as unknown as UserController);

    const res = await app.inject({ method: "GET", url: "/users/42" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "42" });
    expect(getUserController.mock.calls[0][0].params).toEqual({ id: "42" });
  });

  it("DELETE /users/:id returns 204", async () => {
    const deleteUserController = vi.fn(async (_req, reply) => reply.status(204).send());
    const app = await buildApp({ deleteUserController } as unknown as UserController);

    const res = await app.inject({ method: "DELETE", url: "/users/1" });
    expect(res.statusCode).toBe(204);
  });

  it("POST /users rejects an invalid email with 400 before hitting the controller", async () => {
    const createUserController = vi.fn(async (_req, reply) => reply.status(201).send({}));
    const app = await buildApp({ createUserController } as unknown as UserController);

    const res = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "ada", email: "nope" },
    });

    expect(res.statusCode).toBe(400);
    expect(createUserController).not.toHaveBeenCalled();
  });
});
