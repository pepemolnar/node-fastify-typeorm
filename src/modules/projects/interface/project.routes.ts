import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  addTaskSchema,
  createProjectSchema,
  paginatedProjectsResponseSchema,
  projectParamsSchema,
  projectQuerySchema,
  projectResponseSchema,
  taskParamsSchema,
} from "./project.schema.js";
import { ProjectController } from "./project.controller.js";
import { authenticate } from "../../../shared/interface/auth.guards.js";
import { problemDetailsSchema } from "../../../shared/interface/general.schema.js";

export class ProjectRoutes {
  constructor(private controller: ProjectController) {}

  register = async (app: FastifyInstance) => {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.post(
      "/",
      {
        preHandler: [authenticate],
        schema: {
          body: createProjectSchema,
          response: {
            201: projectResponseSchema,
            400: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.createController(req, reply),
    );

    route.get(
      "/",
      {
        preHandler: [authenticate],
        schema: {
          querystring: projectQuerySchema,
          response: { 200: paginatedProjectsResponseSchema },
        },
      },
      (req, reply) => this.controller.listController(req, reply),
    );

    route.get(
      "/:id",
      {
        preHandler: [authenticate],
        schema: {
          params: projectParamsSchema,
          response: {
            200: projectResponseSchema,
            404: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.getController(req, reply),
    );

    route.post(
      "/:id/tasks",
      {
        preHandler: [authenticate],
        schema: {
          params: projectParamsSchema,
          body: addTaskSchema,
          response: {
            201: projectResponseSchema,
            404: problemDetailsSchema,
            409: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.addTaskController(req, reply),
    );

    route.post(
      "/:id/tasks/:taskId/complete",
      {
        preHandler: [authenticate],
        schema: {
          params: taskParamsSchema,
          response: {
            200: projectResponseSchema,
            404: problemDetailsSchema,
            409: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.completeTaskController(req, reply),
    );

    route.post(
      "/:id/archive",
      {
        preHandler: [authenticate],
        schema: {
          params: projectParamsSchema,
          response: {
            200: projectResponseSchema,
            404: problemDetailsSchema,
            409: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.archiveController(req, reply),
    );
  };
}
