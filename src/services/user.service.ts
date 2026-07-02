import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword } from "../helpers/password.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { UserModel } from "../models/user.model.js";
import { User } from "../entities/user.entity.js";
import {
  CreateUserDto,
  UserFiltersDto,
  UpdateUserDto,
  paginatedUsersResponseSchema,
} from "../types/user.types.js";

export class UserService {
  constructor(private userModel: UserModel) {}

  async getUsers(
    limit: number,
    offset: number,
    filters: UserFiltersDto,
  ): Promise<paginatedUsersResponseSchema> {
    return this.userModel.get(limit, offset, filters);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userModel.getById(id);

    if (!user) throw new HttpError(404, "User not found");

    return user;
  }

  async createUser({ name, email, password }: CreateUserDto): Promise<User> {
    return this.userModel.create({
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
    return this.userModel.createMany(normalized);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User | null> {
    return this.userModel.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userModel.softDelete(id);
  }
}
