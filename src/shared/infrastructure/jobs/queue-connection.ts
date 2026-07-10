import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import { env } from "../../../config/env.config.js";

export const createQueueConnection = (): ConnectionOptions =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  }) as unknown as ConnectionOptions;
