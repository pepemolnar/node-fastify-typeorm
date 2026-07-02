import type { FastifyError, FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ error: err.message });
    }

    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply
        .status(400)
        .send({ error: "ValidationError", details: err.validation });
    }

    if (isResponseSerializationError(err)) {
      app.log.error(err, "Response did not match schema");
      return reply.status(500).send({ error: "Internal Server Error" });
    }

    if (typeof err.statusCode === "number" && err.statusCode < 500) {
      return reply.status(err.statusCode).send({ error: err.message });
    }

    app.log.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  });
}
