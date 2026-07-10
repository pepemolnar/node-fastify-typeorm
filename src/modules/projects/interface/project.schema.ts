import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1),

  deadline: z.iso.datetime().optional(),
});

export const addTaskSchema = z.object({
  title: z.string().min(1),
});

export const projectParamsSchema = z.object({
  id: z.uuid(),
});

export const taskParamsSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
});

export const projectQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.enum(["active", "archived"]).optional(),
  })
  .strict();

const taskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["open", "done"]),
});

export const projectResponseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  status: z.enum(["active", "archived"]),
  deadline: z.string().nullable(),
  tasks: z.array(taskResponseSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const paginatedProjectsResponseSchema = z.object({
  data: z.array(projectResponseSchema),
  total: z.coerce.number().int(),
  limit: z.coerce.number().int(),
  offset: z.coerce.number().int(),
});
