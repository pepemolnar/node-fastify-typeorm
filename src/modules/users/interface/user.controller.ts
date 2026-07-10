import type { FastifyRequest, FastifyReply } from "fastify";
import { ListUsers, ListUsersByCursor } from "../application/list-users.js";
import { GetUser } from "../application/get-user.js";
import { CreateUser } from "../application/create-user.js";
import { CreateUsersBulk } from "../application/create-users-bulk.js";
import { UpdateUser } from "../application/update-user.js";
import { DeleteUser } from "../application/delete.user.js";
import {
  CreateUserDto,
  CursorQueryDto,
  UpdateUserDto,
  UserParamsDto,
  UserQueryDto,
} from "./user.dto.js";

export class UserController {
  constructor(
    private listUsers: ListUsers,
    private listUsersByCursor: ListUsersByCursor,
    private getUser: GetUser,
    private createUser: CreateUser,
    private createUsersBulk: CreateUsersBulk,
    private updateUser: UpdateUser,
    private deleteUser: DeleteUser,
  ) {}

  async getUsersController(
    req: FastifyRequest<{ Querystring: UserQueryDto }>,
    reply: FastifyReply,
  ) {
    const { limit, offset, ...filters } = req.query;
    return reply.send(await this.listUsers.execute(limit, offset, filters));
  }

  async getUsersPageController(
    req: FastifyRequest<{ Querystring: CursorQueryDto }>,
    reply: FastifyReply,
  ) {
    const { limit, cursor } = req.query;
    return reply.send(await this.listUsersByCursor.execute(limit, cursor));
  }

  async getUserController(
    req: FastifyRequest<{ Params: UserParamsDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(await this.getUser.execute(req.params.id));
  }

  async createUserController(
    req: FastifyRequest<{ Body: CreateUserDto }>,
    reply: FastifyReply,
  ) {
    return reply.status(201).send(await this.createUser.execute(req.body));
  }

  async createUsersController(
    req: FastifyRequest<{ Body: CreateUserDto[] }>,
    reply: FastifyReply,
  ) {
    return reply.status(201).send(await this.createUsersBulk.execute(req.body));
  }

  async updateUserController(
    req: FastifyRequest<{ Params: UserParamsDto; Body: UpdateUserDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(await this.updateUser.execute(req.params.id, req.body));
  }

  async deleteUserController(
    req: FastifyRequest<{ Params: UserParamsDto }>,
    reply: FastifyReply,
  ) {
    await this.deleteUser.execute(req.params.id);
    return reply.status(204).send();
  }
}
