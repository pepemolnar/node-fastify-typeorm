import type { z } from "zod";
import type { createUserSchema, updateUserSchema, userQuerySchema } from "../schemas/user.schema.js";

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type getUserFiltersDto = z.infer<typeof userQuerySchema>;