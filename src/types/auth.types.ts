import type { z } from "zod";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
