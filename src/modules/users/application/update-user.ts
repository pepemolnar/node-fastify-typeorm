import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { Cache } from "../../../shared/infrastructure/cache/cache.port.js";
import { IUserRepository } from "../domain/user.repository.js";
import { UserSnapshot } from "../domain/user.js";
import { UpdateUserDto } from "../interface/user.dto.js";
import { userCacheKey } from "./get-user.js";

export class UpdateUser {
  constructor(
    private users: IUserRepository,
    private cache: Cache,
  ) {}

  async execute(id: string, data: UpdateUserDto): Promise<UserSnapshot> {
    const user = await this.users.findById(id);
    if (!user) throw new HttpError(404, "User not found!");

    if (data.name !== undefined) user.rename(data.name);
    if (data.email !== undefined) user.changeEmail(data.email);

    await this.users.save(user);
    await this.cache.del(userCacheKey(id));
    return user.toSnapshot();
  }
}
