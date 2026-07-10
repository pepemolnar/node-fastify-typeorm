import type { z } from "zod";
import { loginSchema, registerSchema, refreshSchema } from "./auth.schema.js";

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
