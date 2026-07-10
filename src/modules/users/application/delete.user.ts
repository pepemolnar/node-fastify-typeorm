import { Cache } from "../../../shared/infrastructure/cache/cache.port.js";
import { IUserRepository } from "../domain/user.repository.js";
import { userCacheKey } from "./get-user.js";

export class DeleteUser {
  constructor(
    private users: IUserRepository,
    private cache: Cache,
  ) {}

  async execute(id: string): Promise<void> {
    await this.users.softDelete(id);
    await this.cache.del(userCacheKey(id));
  }
}
