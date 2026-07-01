import type { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";
import { CreateUserDto, getUserFiltersDto, UpdateUserDto } from "../types/user.types.js";

export class UserController {
  constructor(private userService: UserService = new UserService()) { }

  async getUsersController(req: FastifyRequest, reply: FastifyReply) {
    const filters = req.query as getUserFiltersDto;
    if (filters && Object.keys(filters).length) return reply.send(await this.userService.getUsers(filters));
    return reply.send(await this.userService.getAllUsers());
  }

  async getUserController(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    return reply.send(await this.userService.getUser(req.params.id));
  }

  async createUserController(req: FastifyRequest, reply: FastifyReply) {
    return reply.status(201).send(await this.userService.createUser(req.body as CreateUserDto));
  }

  async updateUserController(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    return reply.send(await this.userService.updateUser(req.params.id, req.body as UpdateUserDto));
  }

  async deleteUserController(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.userService.deleteUser(req.params.id);
    return reply.status(204).send();
  }
}


