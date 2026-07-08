import type { DataSource } from "typeorm";
import { UserModel } from "../models/user.model.js";
import { IUserRepository } from "../types/user.types.js";

export interface Repositories {
  users: IUserRepository;
}

export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}

export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(private dataSource: DataSource) {}

  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({ users: new UserModel(manager) }),
    );
  }
}
