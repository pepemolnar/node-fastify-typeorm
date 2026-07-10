import type { FastifyRequest } from "fastify";
import { HttpError } from "../domain/errors/http-error.js";

export async function authenticate(req: FastifyRequest) {
  try {
    await req.jwtVerify();
  } catch {
    throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  }

  if (req.user.typ === "refresh") {
    throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  }
}

export function requireRole(...allowed: Array<"user" | "admin">) {
  return async (req: FastifyRequest) => {
    if (!allowed.includes(req.user.role)) {
      throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
    }
  };
}
