import { User, UserSnapshot } from "../../users/domain/user.js";
import { IUserRepository } from "../../users/domain/user.repository.js";
import { EventBus } from "../../../shared/domain/events/event-bus.js";
import { RegisterDto } from "../interface/auth.dto.js";

export class RegisterUser {
  constructor(
    private users: IUserRepository,
    private events: EventBus,
  ) {}

  async execute(input: RegisterDto): Promise<UserSnapshot> {
    const user = await User.register(input);
    await this.users.add(user);

    for (const event of user.pullDomainEvents()) {
      await this.events.publish(event);
    }

    return user.toSnapshot();
  }
}
