import { z } from 'zod';

const TaskStatus = z.enum(['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE']);
const TaskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatus.optional().default('PENDING'),
  priority: TaskPriority.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  labels: z.array(z.string()).optional(),
  checklist: z.array(z.object({
    text: z.string(),
    done: z.boolean().optional(),
  })).optional(),
  coverColor: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  version: z.number().int().optional(),
});
