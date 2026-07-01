import { capitalizeWords } from "../helpers/string.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { UserModel } from "../models/user.model.js";
import { User } from "../entities/user.entity.js";
import { CreateUserDto, getUserFiltersDto, UpdateUserDto } from "../types/user.types.js";

export class UserService {
  constructor(private userModel: UserModel = new UserModel()) {
  }

  async getAllUsers(): Promise<User[]> {
    return this.userModel.getAll();
  }

  async getUsers(filters: getUserFiltersDto): Promise<User[]> {
    return this.userModel.getBy(filters);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userModel.getById(id);

    if (!user) throw new HttpError(404, "User not found");

    return user;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const existingEmailUser = await this.userModel.getBy({ email: data.email })

    if (existingEmailUser.length) throw new HttpError(400, "Email is already exist!");
    if (data.name) data.name = capitalizeWords(data.name);

    return this.userModel.create(data);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User | null> {
    return this.userModel.update(id, data);
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.softDelete(id);
  }
}
