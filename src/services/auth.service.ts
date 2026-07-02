import { capitalizeWords } from "../helpers/string.helper.js";
import { hashPassword, verifyPassword } from "../helpers/password.helper.js";
import { UserModel } from "../models/user.model.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { LoginDto, RegisterDto } from "../types/auth.types.js";
import { User } from "../entities/user.entity.js";

export interface AuthenticatedUser {
  id: string;
  role: "user" | "admin";
}

export class AuthService {
  constructor(private userModel: UserModel) {}

  // Registration is the public credentialed-create path: hash the password,
  // then persist through the same model (which enforces email uniqueness).
  async register({ name, email, password }: RegisterDto): Promise<User> {
    return this.userModel.create({
      name: capitalizeWords(name),
      email,
      passwordHash: await hashPassword(password),
    });
  }

  async verifyCredentials({
    email,
    password,
  }: LoginDto): Promise<AuthenticatedUser> {
    const user = await this.userModel.getForLogin(email);

    // Same error whether the email is unknown or the password is wrong —
    // never reveal which, to avoid account enumeration.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }

    return { id: user.id, role: user.role };
  }
}
