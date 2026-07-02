import type { z } from "zod";
import type {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
  userQuerySchema,
} from "../schemas/user.schema.js";

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserFiltersDto = z.infer<typeof userQuerySchema>;
export type UserParamsDto = z.infer<typeof userParamsSchema>;
