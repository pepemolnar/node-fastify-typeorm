import { User } from "./user.js";
import { Cursor } from "../../../shared/infrastructure/pagination/cursor.js";

export interface UserFilters {
  id?: string;
  name?: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OffsetPage {
  data: User[];
  total: number;
}

export interface CursorPage {
  data: User[];
  nextCursor: string | null;
}

export interface IUserRepository {
  list(
    limit: number,
    offset: number,
    filters: UserFilters,
  ): Promise<OffsetPage>;
  listByCursor(limit: number, cursor?: Cursor): Promise<CursorPage>;
  findById(id: string): Promise<User | null>;
  findForLogin(email: string): Promise<User | null>;

  add(user: User): Promise<void>;

  save(user: User): Promise<void>;
  softDelete(id: string): Promise<void>;
}
