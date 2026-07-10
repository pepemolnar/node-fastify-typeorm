import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { IUserRepository } from "../../users/domain/user.repository.js";
import { LoginDto } from "../interface/auth.dto.js";

export interface AuthenticatedUser {
  id: string;
  role: "user" | "admin";
}

export class VerifyCredentials {
  constructor(private users: IUserRepository) {}

  async execute({ email, password }: LoginDto): Promise<AuthenticatedUser> {
    const user = await this.users.findForLogin(email);

    if (!user || !(await user.verifyPassword(password))) {
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    return { id: user.id, role: user.role };
  }
}
