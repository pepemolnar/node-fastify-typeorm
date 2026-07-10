import { EntityManager, FindOptionsWhere, LessThan } from "typeorm";
import { User } from "../entities/user.entity.js";
import {
  NewUserDto,
  UserFiltersDto,
  UpdateUserDto,
  paginatedUsersResponseSchema,
  IUserRepository,
  UserCursorPage,
} from "../types/user.types.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { BaseModel } from "./base.model.js";
import { Cursor, encodeCursor } from "../helpers/cursor.helper.js";

export class UserModel extends BaseModel<User> implements IUserRepository {
  constructor(manager: EntityManager) {
    super(manager, User);
  }

  async get(
    limit: number,
    offset: number,
    filters: UserFiltersDto,
  ): Promise<paginatedUsersResponseSchema> {
    const [data, total] = await this.repo().findAndCount(
      this.query()
        .filter(filters)
        .order({ createdAt: "DESC" })
        .paginate(limit, offset)
        .build(),
    );

    return { data, total, limit, offset };
  }

  async getPage(limit: number, cursor?: Cursor): Promise<UserCursorPage> {
    const where = cursor
      ? [
          this.scoped({ createdAt: LessThan(cursor.createdAt) }),
          this.scoped({ createdAt: cursor.createdAt, id: LessThan(cursor.id) }),
        ]
      : this.scoped();

    const rows = await this.repo().find({
      where,
      order: { createdAt: "DESC", id: "DESC" },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data, nextCursor };
  }

  async getById(id: string): Promise<User | null> {
    return this.findOne({ id });
  }

  async getFirst(where: FindOptionsWhere<User>): Promise<User | null> {
    return this.repo().findOne({ where });
  }

  async getForLogin(email: string): Promise<User | null> {
    return this.findOne(
      { email },
      { select: { id: true, email: true, role: true, passwordHash: true } },
    );
  }

  async create(data: NewUserDto): Promise<User> {
    const existing = await this.repo().findOne({
      where: { email: data.email },
    });
    if (existing)
      throw new HttpError(
        409,
        `Email ${data.email} already exists`,
        "EMAIL_ALREADY_EXISTS",
      );

    return this.repo().save(this.repo().create(data));
  }

  async update(id: string, data: UpdateUserDto): Promise<User | null> {
    const user = await this.repo().findOne({ where: { id } });

    if (!user) throw new HttpError(404, "User not found!");
    await this.repo().update(id, data);

    return this.getById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo().update(id, { isDeleted: true });
  }
}
