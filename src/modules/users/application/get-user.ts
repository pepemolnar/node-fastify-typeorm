import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { Cache } from "../../../shared/infrastructure/cache/cache.port.js";
import { IUserRepository } from "../domain/user.repository.js";
import { UserSnapshot } from "../domain/user.js";

export const userCacheKey = (id: string) => `user:${id}`;
export const USER_CACHE_TTL = 60;

export class GetUser {
  constructor(
    private users: IUserRepository,
    private cache: Cache,
  ) {}

  async execute(id: string): Promise<UserSnapshot> {
    const cached = await this.cache.get<UserSnapshot>(userCacheKey(id));
    if (cached) {
      return {
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
      };
    }

    const user = await this.users.findById(id);
    if (!user) throw new HttpError(404, "User not found");

    const snapshot = user.toSnapshot();
    await this.cache.set(userCacheKey(id), snapshot, USER_CACHE_TTL);
    return snapshot;
  }
}
