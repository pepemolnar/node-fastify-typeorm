import type { FastifyInstance } from "fastify";
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  userResponseSchema,
  usersResponseSchema,
  errorResponseSchema,
  userParamsSchema,
  paginatedUsersResponseSchema,
  createUsersSchema,
} from "../schemas/user.schema.js";
import { UserController } from "../controllers/user.controller.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export class UserRoutes {
  constructor(private controller: UserController) {}

  register = async (app: FastifyInstance) => {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
      "/",
      {
        schema: {
          querystring: userQuerySchema,
          response: { 200: paginatedUsersResponseSchema },
        },
      },
      (req, reply) => this.controller.getUsersController(req, reply),
    );

    route.post(
      "/",
      {
        schema: {
          body: createUserSchema,
          response: {
            201: userResponseSchema,
            400: errorResponseSchema,
          },
        },
      },
      (req, reply) => this.controller.createUserController(req, reply),
    );

    route.post(
      "/bulk",
      {
        schema: {
          body: createUsersSchema,
          response: { 201: usersResponseSchema },
        },
      },
      (req, reply) => this.controller.createUsersController(req, reply),
    );

    route.get(
      "/:id",
      {
        schema: {
          params: userParamsSchema,
          response: {
            200: userResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (req, reply) => this.controller.getUserController(req, reply),
    );

    route.put(
      "/:id",
      {
        schema: {
          params: userParamsSchema,
          body: updateUserSchema,
          response: {
            200: userResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (req, reply) => this.controller.updateUserController(req, reply),
    );

    route.delete(
      "/:id",
      {
        schema: {
          params: userParamsSchema,
        },
      },
      (req, reply) => this.controller.deleteUserController(req, reply),
    );
  };
}
