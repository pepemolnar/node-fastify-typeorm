import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { LoginDto, RegisterDto } from "../types/auth.types.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  async registerController(
    req: FastifyRequest<{ Body: RegisterDto }>,
    reply: FastifyReply,
  ) {
    const user = await this.authService.register(req.body);
    return reply.status(201).send(user);
  }

  async loginController(
    req: FastifyRequest<{ Body: LoginDto }>,
    reply: FastifyReply,
  ) {
    const user = await this.authService.verifyCredentials(req.body);

    const token = await reply.jwtSign({ sub: user.id, role: user.role });

    return reply.send({ token });
  }
}
