import {
  EntityManager,
  FindOptionsSelect,
  FindOptionsWhere,
  LessThan,
} from "typeorm";
import { User as UserEntity } from "./user.entity.js";
import { User } from "../domain/user.js";
import { UserMapper } from "./user.mapper.js";
import {
  CursorPage,
  IUserRepository,
  OffsetPage,
  UserFilters,
} from "../domain/user.repository.js";
import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { BaseRepository } from "../../../shared/infrastructure/persistence/base-repository.js";
import {
  Cursor,
  encodeCursor,
} from "../../../shared/infrastructure/pagination/cursor.js";

const FULL_SELECT: FindOptionsSelect<UserEntity> = {
  id: true,
  name: true,
  email: true,
  role: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
};

export class UserRepository
  extends BaseRepository<UserEntity>
  implements IUserRepository
{
  constructor(manager: EntityManager) {
    super(manager, UserEntity);
  }

  async list(
    limit: number,
    offset: number,
    filters: UserFilters,
  ): Promise<OffsetPage> {
    const options = this.query()
      .filter(filters as FindOptionsWhere<UserEntity>)
      .order({ createdAt: "DESC" })
      .paginate(limit, offset)
      .build();
    options.select = FULL_SELECT;

    const [rows, total] = await this.repo().findAndCount(options);
    return { data: rows.map((row) => UserMapper.toDomain(row)), total };
  }

  async listByCursor(limit: number, cursor?: Cursor): Promise<CursorPage> {
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
      select: FULL_SELECT,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data: page.map((row) => UserMapper.toDomain(row)), nextCursor };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.findOne({ id }, { select: FULL_SELECT });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findForLogin(email: string): Promise<User | null> {
    const row = await this.findOne({ email }, { select: FULL_SELECT });
    return row ? UserMapper.toDomain(row) : null;
  }

  async add(user: User): Promise<void> {
    const existing = await this.repo().findOne({
      where: { email: user.email },
    });
    if (existing) {
      throw new HttpError(
        409,
        `Email ${user.email} already exists`,
        "EMAIL_ALREADY_EXISTS",
      );
    }
    await this.repo().save(UserMapper.toEntity(user));
  }

  async save(user: User): Promise<void> {
    await this.repo().save(UserMapper.toEntity(user));
  }

  async softDelete(id: string): Promise<void> {
    await this.repo().update(id, { isDeleted: true });
  }
}
