import type { z } from "zod";
import type {
  createUserSchema,
  cursorPageResponseSchema,
  cursorQuerySchema,
  paginatedUsersResponseSchema,
  updateUserSchema,
  userFilterSchema,
  userParamsSchema,
  userQuerySchema,
} from "../schemas/user.schema.js";
import { User } from "../entities/user.entity.js";
import { Cursor } from "../helpers/cursor.helper.js";

export type CreateUserDto = z.infer<typeof createUserSchema>;
// What the persistence layer stores: the raw password is already hashed away.
export type NewUserDto = Omit<CreateUserDto, "password"> & {
  passwordHash: string;
};
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserQueryDto = z.infer<typeof userQuerySchema>;
export type UserFiltersDto = z.infer<typeof userFilterSchema>;
export type UserParamsDto = z.infer<typeof userParamsSchema>;
export type paginatedUsersResponseSchema = z.infer<
  typeof paginatedUsersResponseSchema
>;
export type CursorQueryDto = z.infer<typeof cursorQuerySchema>;
export type CursorPageResponse = z.infer<typeof cursorPageResponseSchema>;

export type UserCursorPage = { data: User[]; nextCursor: string | null };

export interface IUserRepository {
  get(
    limit: number,
    offset: number,
    filters: UserFiltersDto,
  ): Promise<paginatedUsersResponseSchema>;
  getPage(limit: number, cursor?: Cursor): Promise<UserCursorPage>;
  getById(id: string): Promise<User | null>;
  getForLogin(email: string): Promise<User | null>;
  create(data: NewUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User | null>;
  softDelete(id: string): Promise<void>;
}
