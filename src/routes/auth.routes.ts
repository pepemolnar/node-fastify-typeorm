import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  tokenPairResponseSchema,
} from "../schemas/auth.schema.js";
import { userResponseSchema } from "../schemas/user.schema.js";
import { AuthController } from "../controllers/auth.controller.js";
import { problemDetailsSchema } from "../schemas/general.schema.js";

export class AuthRoutes {
  constructor(private controller: AuthController) {}

  register = async (app: FastifyInstance) => {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.post(
      "/register",
      {
        schema: {
          body: registerSchema,
          response: {
            201: userResponseSchema,
            400: problemDetailsSchema,
            409: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.registerController(req, reply),
    );

    route.post(
      "/login",
      {
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
        schema: {
          body: loginSchema,
          response: {
            200: tokenPairResponseSchema,
            401: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.loginController(req, reply),
    );

    route.post(
      "/refresh",
      {
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
          body: refreshSchema,
          response: {
            200: tokenPairResponseSchema,
            401: problemDetailsSchema,
          },
        },
      },
      (req, reply) => this.controller.refreshController(req, reply),
    );

    route.post(
      "/logout",
      {
        schema: {
          body: refreshSchema,
          response: { 204: z.null() },
        },
      },
      (req, reply) => this.controller.logoutController(req, reply),
    );
  };
}
