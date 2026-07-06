import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword, verifyPassword } from "../helpers/password.helper.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { LoginDto, RegisterDto } from "../types/auth.types.js";
import { User } from "../entities/user.entity.js";
import { NotificationService } from "./notification.service.js";
import { IUserRepository } from "../types/user.types.js";

export interface AuthenticatedUser {
  id: string;
  role: "user" | "admin";
}

export class AuthService {
  constructor(
    private users: IUserRepository,
    private notifications: NotificationService,
  ) {}

  async register({ name, email, password }: RegisterDto): Promise<User> {
    const user = await this.users.create({
      name: capitalizeWords(name),
      email,
      passwordHash: await hashPassword(password),
    });
    await this.notifications.notify("log", user.email, "Welcome!");
    return user;
  }

  async verifyCredentials({
    email,
    password,
  }: LoginDto): Promise<AuthenticatedUser> {
    const user = await this.users.getForLogin(email);

    // Same error whether the email is unknown or the password is wrong —
    // never reveal which, to avoid account enumeration.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }

    return { id: user.id, role: user.role };
  }
}
