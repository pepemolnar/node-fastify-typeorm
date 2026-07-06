import Fastify, { type FastifyBaseLogger } from "fastify";
import type { Logger } from "pino";
import { env } from "./config/env.config.js";
import { createLogger } from "./config/logger.js";
import { routes } from "./routes/index.js";
import { registerErrorHandler } from "./middlewares/errorHandler.js";
import { Container } from "./container.js";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { authPlugin } from "./plugins/auth.plugin.js";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";

export async function createApp(container: Container, logger?: Logger) {
  const app = Fastify({
    loggerInstance: (logger ?? createLogger()) as FastifyBaseLogger,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  await app.register(fastifyCors, { origin: env.CORS_ORIGIN });

  await app.register(fastifySwagger, {
    openapi: {
      info: { title: "User API", version: "1.0.0" },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });

  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  await app.register(authPlugin);
  await app.register(async (instance) => routes(instance, container));

  registerErrorHandler(app);
  return app;
}
