import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/env.config.js";

// The shape you sign into the token
export interface JwtUser {
  sub: string; // user id
  role: "user" | "admin";
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtUser; // populated by jwtVerify()
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
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });
});
