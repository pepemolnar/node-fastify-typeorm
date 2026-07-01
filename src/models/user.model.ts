import { Repository } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../entities/user.entity.js";
import { CreateUserDto, getUserFiltersDto, UpdateUserDto } from "../types/user.types.js";

export class UserModel {
  constructor(private repo: Repository<User> = AppDataSource.getRepository(User)) { }

  async getAll(): Promise<User[]> {
    return this.repo.find({ where: { isDeleted: false } });
  }

  async getById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async getBy(filters: getUserFiltersDto): Promise<User[]> {
    return this.repo.find({ where: { ...filters, isDeleted: false } });
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: UpdateUserDto): Promise<User | null> {
    await this.repo.update(id, data);
    return this.getById(id);
  }

  async softDelete(id: string): Promise<User | null> {
    await this.repo.update(id, { isDeleted: true });
    return this.getById(id);
  }
}