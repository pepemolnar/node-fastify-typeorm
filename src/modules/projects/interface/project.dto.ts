import type { z } from "zod";
import {
  addTaskSchema,
  createProjectSchema,
  projectParamsSchema,
  projectQuerySchema,
  taskParamsSchema,
} from "./project.schema.js";

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type AddTaskDto = z.infer<typeof addTaskSchema>;
export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;
export type ProjectParamsDto = z.infer<typeof projectParamsSchema>;
export type TaskParamsDto = z.infer<typeof taskParamsSchema>;
