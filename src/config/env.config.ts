import { z } from "zod";

export const env = z
  .object({
    PORT: z.coerce.number().default(3000),
    GREETING: z.string().min(1).default("Hello, World!"),
    DATABASE_URL: z.string().min(1),
  })
  .parse(process.env);