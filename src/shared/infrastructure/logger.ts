import pino, { type Logger } from "pino";
import { env } from "../../config/env.config.js";

export function createLogger(): Logger {
  const isDev = env.NODE_ENV === "development";
  return pino({
    level: env.LOG_LEVEL,
    transport: isDev ? { target: "pino-pretty" } : undefined,
  });
}
