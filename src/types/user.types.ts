import type { z } from "zod";
import type {
  createUserSchema,
  paginatedUsersResponseSchema,
  updateUserSchema,
  userFilterSchema,
  userParamsSchema,
  userQuerySchema,
} from "../schemas/user.schema.js";

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserQueryDto = z.infer<typeof userQuerySchema>;
export type UserFiltersDto = z.infer<typeof userFilterSchema>;
export type UserParamsDto = z.infer<typeof userParamsSchema>;
export type paginatedUsersResponseSchema = z.infer<
  typeof paginatedUsersResponseSchema
>;
