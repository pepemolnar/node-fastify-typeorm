import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { env } from "../../../config/env.config.js";

export interface JwtUser {
  sub: string;
  role: "user" | "admin";
  typ: "access" | "refresh";
  jti?: string;
  family?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtUser;
  }
}
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  });
});
