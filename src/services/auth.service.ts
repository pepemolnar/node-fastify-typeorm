import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword, verifyPassword } from "../helpers/password.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { LoginDto, RegisterDto } from "../types/auth.types.js";
import { User } from "../entities/user.entity.js";
import { IUserRepository } from "../types/user.types.js";
import { EventBus } from "../extras/events/event-bus.js";

export interface AuthenticatedUser {
  id: string;
  role: "user" | "admin";
}

export class AuthService {
  constructor(
    private users: IUserRepository,
    private events: EventBus,
  ) {}

  async register({ name, email, password }: RegisterDto): Promise<User> {
    const user = await this.users.create({
      name: capitalizeWords(name),
      email,
      passwordHash: await hashPassword(password),
    });

    await this.events.publish({
      type: "UserRegistered",
      userId: user.id,
      email: user.email,
      name: user.name,
      occurredAt: new Date(),
    });

    return user;
  }

  async verifyCredentials({
    email,
    password,
  }: LoginDto): Promise<AuthenticatedUser> {
    const user = await this.users.getForLogin(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }

    return { id: user.id, role: user.role };
  }
}
