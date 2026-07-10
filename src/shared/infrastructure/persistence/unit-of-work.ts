import type { DataSource } from "typeorm";
import { UserRepository } from "../../../modules/users/infrastructure/user.repository.js";
import { IUserRepository } from "../../../modules/users/domain/user.repository.js";

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
      work({ users: new UserRepository(manager) }),
    );
  }
}
