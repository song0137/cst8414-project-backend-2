import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1),
});
