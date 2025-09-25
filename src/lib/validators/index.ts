import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(120).optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const commentCreateSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");
