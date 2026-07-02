import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

export const echoSchema = z.object({ name: z.string().min(1) });

export function echo(req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ youSent: req.body });
}
