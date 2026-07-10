import type { FastifyError, FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { HttpError } from "../domain/errors/http-error.js";
import { buildProblem, toInvalidParams } from "./problem.js";

const PROBLEM_CONTENT_TYPE = "application/problem+json";

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((req, reply) => {
    reply
      .type(PROBLEM_CONTENT_TYPE)
      .status(404)
      .send(
        buildProblem({
          status: 404,
          code: "ROUTE_NOT_FOUND",
          detail: `Route ${req.method}:${req.url} not found`,
          instance: req.id,
        }),
      );
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    reply.type(PROBLEM_CONTENT_TYPE);

    if (err instanceof HttpError) {
      return reply.status(err.status).send(
        buildProblem({
          status: err.status,
          code: err.code,
          detail: err.message,
          instance: req.id,
        }),
      );
    }

    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send(
        buildProblem({
          status: 400,
          code: "VALIDATION_ERROR",
          title: "Validation Error",
          detail: "Request validation failed",
          instance: req.id,
          errors: toInvalidParams(err.validation),
        }),
      );
    }

    if (isResponseSerializationError(err)) {
      app.log.error(err, "Response did not match schema");
      return reply
        .status(500)
        .send(buildProblem({ status: 500, instance: req.id }));
    }

    if (typeof err.statusCode === "number" && err.statusCode < 500) {
      return reply.status(err.statusCode).send(
        buildProblem({
          status: err.statusCode,
          detail: err.message,
          instance: req.id,
        }),
      );
    }

    app.log.error(err);
    return reply
      .status(500)
      .send(buildProblem({ status: 500, instance: req.id }));
  });
}
