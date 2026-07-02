import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

// password is set via register/create only, never via a plain update
export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial();

export const userFilterSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    email: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .strict();

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const usersResponseSchema = z.array(userResponseSchema);

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export const userParamsSchema = z.object({
  id: z.uuid(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const userQuerySchema = userFilterSchema
  .merge(paginationSchema)
  .strict();

export const paginatedUsersResponseSchema = z.object({
  data: usersResponseSchema,
  total: z.coerce.number().int(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createUsersSchema = z.array(createUserSchema).min(1).max(100);
