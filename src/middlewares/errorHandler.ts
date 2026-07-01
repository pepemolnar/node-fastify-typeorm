import type { FastifyInstance } from "fastify";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ error: err.message });
    }
    app.log.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  });
}
