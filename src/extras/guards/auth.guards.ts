import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(...allowed: Array<"user" | "admin">) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!allowed.includes(req.user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}
