import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  participants: z.array(z.string()).optional().default([]),
  link: z.string().url().optional().nullable().or(z.literal('')),
  platform: z.string().optional().nullable(),
  recordWithAi: z.boolean().optional(),
});
