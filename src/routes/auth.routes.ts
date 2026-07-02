import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  loginSchema,
  registerSchema,
  tokenResponseSchema,
} from "../schemas/auth.schema.js";
import {
  errorResponseSchema,
  userResponseSchema,
} from "../schemas/user.schema.js";
import { AuthController } from "../controllers/auth.controller.js";

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
            400: errorResponseSchema,
          },
        },
      },
      (req, reply) => this.controller.registerController(req, reply),
    );

    route.post(
      "/login",
      {
        schema: {
          body: loginSchema,
          response: {
            200: tokenResponseSchema,
            401: errorResponseSchema,
          },
        },
      },
      (req, reply) => this.controller.loginController(req, reply),
    );
  };
}
