import type { FastifyRequest, FastifyReply } from "fastify";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "ValidationError",
        details: result.error.issues,
      });
    }
    req.body = result.data;
  };
}

export function validateQuery(schema: ZodType) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return reply.status(400).send({
        error: "ValidationError",
        details: result.error.issues,
      });
    }
    req.query = result.data;
  };
}