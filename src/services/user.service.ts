import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword } from "../helpers/password.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type { UnitOfWork } from "../db/unit-of-work.js";
import { User } from "../entities/user.entity.js";
import {
  CreateUserDto,
  CursorPageResponse,
  UserFiltersDto,
  UpdateUserDto,
  paginatedUsersResponseSchema,
  IUserRepository,
} from "../types/user.types.js";
import { decodeCursor } from "../helpers/cursor.helper.js";

export class UserService {
  constructor(
    private users: IUserRepository,
    private uow: UnitOfWork,
  ) {}

  async getUsers(
    limit: number,
    offset: number,
    filters: UserFiltersDto,
  ): Promise<paginatedUsersResponseSchema> {
    return this.users.get(limit, offset, filters);
  }

  async getUsersPage(
    limit: number,
    cursor?: string,
  ): Promise<CursorPageResponse> {
    const decoded = cursor ? decodeCursor(cursor) : undefined;
    return this.users.getPage(limit, decoded);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.users.getById(id);

    if (!user) throw new HttpError(404, "User not found");

    return user;
  }

  async createUser({ name, email, password }: CreateUserDto): Promise<User> {
    return this.users.create({
      name: capitalizeWords(name),
      email,
      passwordHash: await hashPassword(password),
    });
  }

  async createUsers(items: CreateUserDto[]): Promise<User[]> {
    const normalized = await Promise.all(
      items.map(async ({ name, email, password }) => ({
        name: capitalizeWords(name),
        email,
        passwordHash: await hashPassword(password),
      })),
    );

    // One transaction for the whole batch: the Unit of Work coordinates the
    // repository calls so that if any insert fails (e.g. a duplicate email),
    // every prior insert in the batch is rolled back too.
    return this.uow.run(async ({ users }) => {
      const created: User[] = [];
      for (const data of normalized) {
        created.push(await users.create(data));
      }
      return created;
    });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User | null> {
    return this.users.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.users.softDelete(id);
  }
}
