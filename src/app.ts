import Fastify, { type FastifyBaseLogger } from "fastify";
import type { Logger } from "pino";
import { env } from "./config/env.config.js";
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
import { authPlugin } from "./extras/auth/auth.plugin.js";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import { createLogger } from "./extras/logger.js";

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

  await app.register(rateLimit, {
    global: false,
    // Redis-backed store shares the count across instances. In tests fall back
    // to the in-memory store so we don't open a real connection.
    ...(env.NODE_ENV === "test" ? {} : { redis: new Redis(env.REDIS_URL) }),
    max: 100,
    timeWindow: "1 minute",
  });

  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  await app.register(authPlugin);
  await app.register(async (instance) => routes(instance, container));

  registerErrorHandler(app);
  return app;
}
