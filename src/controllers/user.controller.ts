import type { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";
import {
  CreateUserDto,
  CursorQueryDto,
  UpdateUserDto,
  UserQueryDto,
  UserParamsDto,
} from "../types/user.types.js";

export class UserController {
  constructor(private userService: UserService) {}

  async getUsersController(
    req: FastifyRequest<{ Querystring: UserQueryDto }>,
    reply: FastifyReply,
  ) {
    const { limit, offset, ...filters } = req.query;

    return reply.send(await this.userService.getUsers(limit, offset, filters));
  }

  async getUsersPageController(
    req: FastifyRequest<{ Querystring: CursorQueryDto }>,
    reply: FastifyReply,
  ) {
    const { limit, cursor } = req.query;

    return reply.send(await this.userService.getUsersPage(limit, cursor));
  }

  async getUserController(
    req: FastifyRequest<{ Params: UserParamsDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(await this.userService.getUser(req.params.id));
  }

  async createUserController(
    req: FastifyRequest<{ Body: CreateUserDto }>,
    reply: FastifyReply,
  ) {
    return reply.status(201).send(await this.userService.createUser(req.body));
  }

  async createUsersController(
    req: FastifyRequest<{ Body: CreateUserDto[] }>,
    reply: FastifyReply,
  ) {
    return reply.status(201).send(await this.userService.createUsers(req.body));
  }

  async updateUserController(
    req: FastifyRequest<{ Params: UserParamsDto; Body: UpdateUserDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(
      await this.userService.updateUser(req.params.id, req.body),
    );
  }

  async deleteUserController(
    req: FastifyRequest<{ Params: UserParamsDto }>,
    reply: FastifyReply,
  ) {
    await this.userService.deleteUser(req.params.id);
    return reply.status(204).send();
  }
}
