import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword } from "../helpers/password.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type { UnitOfWork } from "../extras/unit-of-work.js";
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
import { Cache } from "../extras/adapters/cache.port.js";

export class UserService {
  private TTL = 60;
  private userKey = (id: string) => `user:${id}`;

  constructor(
    private users: IUserRepository,
    private uow: UnitOfWork,
    private cache: Cache,
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
    const cachedUser = await this.cache.get<User>(this.userKey(id));
    if (cachedUser) return cachedUser;

    const user = await this.users.getById(id);
    if (!user) throw new HttpError(404, "User not found");

    await this.cache.set(this.userKey(id), user, this.TTL);

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
    const updated = await this.users.update(id, data);
    await this.cache.del(this.userKey(id));
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.users.softDelete(id);
    await this.cache.del(this.userKey(id));
  }
}
