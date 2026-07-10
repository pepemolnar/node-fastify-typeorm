import type { FastifyInstance } from "fastify";
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  userResponseSchema,
  usersResponseSchema,
  userParamsSchema,
  paginatedUsersResponseSchema,
  createUsersSchema,
  cursorQuerySchema,
  cursorPageResponseSchema,
} from "./user.schema.js";
import { UserController } from "./user.controller.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  authenticate,
  requireRole,
} from "../../../shared/interface/auth.guards.js";
import { idempotency } from "../../../shared/interface/idempotency.js";
import type { Cache } from "../../../shared/infrastructure/cache/cache.port.js";
import { problemDetailsSchema } from "../../../shared/interface/general.schema.js";

export class UserRoutes {
  constructor(
    private controller: UserController,
    private cache: Cache,
  ) {}

  register = async (app: FastifyInstance) => {
    const route = app.withTypeProvider<ZodTypeProvider>();
    const idem = idempotency(this.cache);

    route.get(
      "/",
      {
        preHandler: [authenticate],
        schema: {
          querystring: userQuerySchema,
          response: { 200: paginatedUsersResponseSchema },
        },
      },
      (req, reply) => this.controller.getUsersController(req, reply),
    );

    route.get(
      "/cursor",
      {
        preHandler: [authenticate],
        schema: {
          querystring: cursorQuerySchema,
          response: {
            200: cursorPageResponseSchema,
            400: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.getUsersPageController(req, reply),
    );

    route.post(
      "/",
      {
        preHandler: [authenticate, requireRole("admin"), idem.replay],
        onSend: idem.remember,
        schema: {
          body: createUserSchema,
          response: {
            201: userResponseSchema,
            400: problemDetailsSchema,
            409: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.createUserController(req, reply),
    );

    route.post(
      "/bulk",
      {
        preHandler: [authenticate, requireRole("admin")],
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
        preHandler: [authenticate],
        schema: {
          params: userParamsSchema,
          response: {
            200: userResponseSchema,
            404: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.getUserController(req, reply),
    );

    route.put(
      "/:id",
      {
        preHandler: [authenticate, requireRole("admin")],
        schema: {
          params: userParamsSchema,
          body: updateUserSchema,
          response: {
            200: userResponseSchema,
            400: problemDetailsSchema,
            404: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.updateUserController(req, reply),
    );

    route.delete(
      "/:id",
      {
        preHandler: [authenticate, requireRole("admin")],
        schema: {
          params: userParamsSchema,
        },
      },
      (req, reply) => this.controller.deleteUserController(req, reply),
    );
  };
}
