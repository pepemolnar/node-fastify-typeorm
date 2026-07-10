import { User, UserSnapshot } from "../domain/user.js";
import { UnitOfWork } from "../../../shared/infrastructure/persistence/unit-of-work.js";
import { CreateUserDto } from "../interface/user.dto.js";

export class CreateUsersBulk {
  constructor(private uow: UnitOfWork) {}

  async execute(inputs: CreateUserDto[]): Promise<UserSnapshot[]> {
    const users = await Promise.all(inputs.map((input) => User.create(input)));

    return this.uow.run(async ({ users: repo }) => {
      const created: UserSnapshot[] = [];
      for (const user of users) {
        await repo.add(user);
        created.push(user.toSnapshot());
      }
      return created;
    });
  }
}
