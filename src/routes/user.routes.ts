import type { FastifyInstance } from "fastify";
import { validateBody, validateQuery } from "../middlewares/validators.js";
import { createUserSchema, updateUserSchema, userQuerySchema } from "../schemas/user.schema.js";
import { UserController } from "../controllers/user.controller.js";

export class UserRoutes {
  constructor(private controller: UserController = new UserController()) { }

  register = async (app: FastifyInstance) => {
    app.get("/", { preHandler: validateQuery(userQuerySchema) }, (req, reply) =>
      this.controller.getUsersController(req, reply));

    app.post("/", { preHandler: validateBody(createUserSchema) }, (req, reply) =>
      this.controller.createUserController(req, reply));

    app.get<{ Params: { id: string } }>("/:id", (req, reply) =>
      this.controller.getUserController(req, reply));

    app.put<{ Params: { id: string } }>("/:id", { preHandler: validateBody(updateUserSchema) }, (req, reply) =>
      this.controller.updateUserController(req, reply));

    app.delete<{ Params: { id: string } }>("/:id", (req, reply) =>
      this.controller.deleteUserController(req, reply));
  };
}
