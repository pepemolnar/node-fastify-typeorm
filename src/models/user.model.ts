import { EntityManager, FindOptionsWhere } from "typeorm";
import { User } from "../entities/user.entity.js";
import {
  NewUserDto,
  UserFiltersDto,
  UpdateUserDto,
  paginatedUsersResponseSchema,
} from "../types/user.types.js";
import { HttpError } from "../middlewares/errorHandler.js";

export class UserModel {
  constructor(private manager: EntityManager) {}

  private repo(m = this.manager) {
    return m.getRepository(User);
  }

  async get(
    limit: number,
    offset: number,
    filters: UserFiltersDto,
  ): Promise<paginatedUsersResponseSchema> {
    const [data, total] = await this.repo().findAndCount({
      where: { ...filters, isDeleted: false },
      take: limit,
      skip: offset,
      order: { createdAt: "DESC" },
    });
    return { data, total, limit, offset };
  }

  async getById(id: string): Promise<User | null> {
    return this.repo().findOne({ where: { id, isDeleted: false } });
  }

  async getFirst(where: FindOptionsWhere<User>): Promise<User | null> {
    return this.repo().findOne({ where });
  }

  async getForLogin(email: string): Promise<User | null> {
    return this.repo().findOne({
      where: { email, isDeleted: false },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
  }

  async create(data: NewUserDto): Promise<User> {
    const existing = await this.repo().findOne({
      where: { email: data.email },
    });
    if (existing)
      throw new HttpError(400, `Email ${data.email} already exists`);

    return this.repo().save(this.repo().create(data));
  }

  async createMany(items: NewUserDto[]): Promise<User[]> {
    return this.manager.transaction(async (m) => {
      const repo = m.getRepository(User);
      const created: User[] = [];
      for (const data of items) {
        const existing = await repo.findOne({ where: { email: data.email } });
        if (existing)
          throw new HttpError(400, `Email ${data.email} already exists`);
        created.push(await repo.save(repo.create(data)));
      }
      return created;
    });
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
