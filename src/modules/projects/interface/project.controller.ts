import type { FastifyRequest, FastifyReply } from "fastify";
import { CreateProject } from "../application/create-project.js";
import { GetProject } from "../application/get-project.js";
import { ListProjects } from "../application/list-projects.js";
import { AddTask } from "../application/add-task.js";
import { CompleteTask } from "../application/complete-task.js";
import { ArchiveProject } from "../application/archive-project.js";
import {
  AddTaskDto,
  CreateProjectDto,
  ProjectParamsDto,
  ProjectQueryDto,
  TaskParamsDto,
} from "./project.dto.js";

export class ProjectController {
  constructor(
    private createProject: CreateProject,
    private getProject: GetProject,
    private listProjects: ListProjects,
    private addTask: AddTask,
    private completeTask: CompleteTask,
    private archiveProject: ArchiveProject,
  ) {}

  async createController(
    req: FastifyRequest<{ Body: CreateProjectDto }>,
    reply: FastifyReply,
  ) {
    const project = await this.createProject.execute(req.user.sub, req.body);
    return reply.status(201).send(project);
  }

  async listController(
    req: FastifyRequest<{ Querystring: ProjectQueryDto }>,
    reply: FastifyReply,
  ) {
    const { limit, offset, status } = req.query;

    return reply.send(
      await this.listProjects.execute(limit, offset, {
        ownerId: req.user.sub,
        status,
      }),
    );
  }

  async getController(
    req: FastifyRequest<{ Params: ProjectParamsDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(await this.getProject.execute(req.params.id));
  }

  async addTaskController(
    req: FastifyRequest<{ Params: ProjectParamsDto; Body: AddTaskDto }>,
    reply: FastifyReply,
  ) {
    return reply
      .status(201)
      .send(await this.addTask.execute(req.params.id, req.body));
  }

  async completeTaskController(
    req: FastifyRequest<{ Params: TaskParamsDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(
      await this.completeTask.execute(req.params.id, req.params.taskId),
    );
  }

  async archiveController(
    req: FastifyRequest<{ Params: ProjectParamsDto }>,
    reply: FastifyReply,
  ) {
    return reply.send(await this.archiveProject.execute(req.params.id));
  }
}
