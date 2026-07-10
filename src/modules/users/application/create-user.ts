import { User, UserSnapshot } from "../domain/user.js";
import { IUserRepository } from "../domain/user.repository.js";
import { CreateUserDto } from "../interface/user.dto.js";

export class CreateUser {
  constructor(private users: IUserRepository) {}

  async execute(input: CreateUserDto): Promise<UserSnapshot> {
    const user = await User.create(input);
    await this.users.add(user);
    return user.toSnapshot();
  }
}
