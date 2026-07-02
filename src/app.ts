import Fastify from "fastify";
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

export async function createApp(container: Container) {
  const isDev = env.NODE_ENV === "development";
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: isDev
        ? {
            target: "pino-pretty",
          }
        : undefined,
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

  await app.register(async (instance) => routes(instance, container));

  registerErrorHandler(app);
  return app;
}
