import {
  EntityManager,
  EntityTarget,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
} from "typeorm";
import { FindOptionsBuilder } from "./query/query-builder.js";

export type SoftDeletable = { isDeleted: boolean };

export abstract class BaseModel<T extends ObjectLiteral & SoftDeletable> {
  constructor(
    protected manager: EntityManager,
    private entity: EntityTarget<T>,
  ) {}

  protected repo(m = this.manager) {
    return m.getRepository(this.entity);
  }

  protected scoped(where: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
    return Object.assign({}, where, {
      isDeleted: false,
    }) as FindOptionsWhere<T>;
  }

  protected query() {
    return new FindOptionsBuilder<T>().filter(this.scoped());
  }

  protected findOne(
    where: FindOptionsWhere<T>,
    options: Omit<FindOneOptions<T>, "where"> = {},
  ): Promise<T | null> {
    return this.repo().findOne(
      Object.assign({}, options, {
        where: this.scoped(where),
      }) as FindOneOptions<T>,
    );
  }
}
