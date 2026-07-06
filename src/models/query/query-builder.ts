import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
} from "typeorm";

export class FindOptionsBuilder<T extends ObjectLiteral> {
  private where: FindOptionsWhere<T> = {};
  private opts: FindManyOptions<T> = {};
  filter(f: FindOptionsWhere<T>) {
    Object.assign(this.where, f);
    return this;
  }
  order(order: FindOptionsOrder<T>) {
    this.opts.order = order;
    return this;
  }
  paginate(limit: number, offset: number) {
    this.opts.take = limit;
    this.opts.skip = offset;
    return this;
  }
  build(): FindManyOptions<T> {
    return { ...this.opts, where: this.where };
  }
}
