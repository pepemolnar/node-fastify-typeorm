import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

export const updateUserSchema = createUserSchema.partial();

export const userQuerySchema = z
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
