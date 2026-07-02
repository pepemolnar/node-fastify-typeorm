import { Repository } from "typeorm";
import { User } from "../entities/user.entity.js";
import {
  CreateUserDto,
  UserFiltersDto,
  UpdateUserDto,
} from "../types/user.types.js";
import { HttpError } from "../middlewares/errorHandler.js";

export class UserModel {
  constructor(private repo: Repository<User>) {}

  async getAll(): Promise<User[]> {
    return this.repo.find({ where: { isDeleted: false } });
  }

  async getById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async getBy(filters: UserFiltersDto): Promise<User[]> {
    return this.repo.find({ where: { ...filters, isDeleted: false } });
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: UpdateUserDto): Promise<User | null> {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) throw new HttpError(404, "User not found!");
    await this.repo.update(id, data);

    return this.getById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isDeleted: true });
  }
}
