import { decodeCursor } from "../../../shared/infrastructure/pagination/cursor.js";
import { IUserRepository, UserFilters } from "../domain/user.repository.js";
import { UserSnapshot } from "../domain/user.js";

export interface PaginatedUsers {
  data: UserSnapshot[];
  total: number;
  limit: number;
  offset: number;
}

export interface CursorPageResult {
  data: UserSnapshot[];
  nextCursor: string | null;
}

export class ListUsers {
  constructor(private users: IUserRepository) {}

  async execute(
    limit: number,
    offset: number,
    filters: UserFilters,
  ): Promise<PaginatedUsers> {
    const { data, total } = await this.users.list(limit, offset, filters);
    return {
      data: data.map((user) => user.toSnapshot()),
      total,
      limit,
      offset,
    };
  }
}

export class ListUsersByCursor {
  constructor(private users: IUserRepository) {}

  async execute(limit: number, cursor?: string): Promise<CursorPageResult> {
    const decoded = cursor ? decodeCursor(cursor) : undefined;
    const { data, nextCursor } = await this.users.listByCursor(limit, decoded);
    return { data: data.map((user) => user.toSnapshot()), nextCursor };
  }
}
