import { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';
import { AuthRequest } from '../../middleware/auth';

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  try {
    const result = await authService.register(parsed.data);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Register failed' });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  try {
    const result = await authService.login(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Login failed' });
  }
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await authService.me(req.user.userId);
    return res.status(200).json(user);
  } catch (error) {
    return res.status(404).json({ message: error instanceof Error ? error.message : 'User not found' });
  }
}
