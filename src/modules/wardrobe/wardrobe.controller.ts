import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { wardrobeCreateSchema, wardrobeQuerySchema, wardrobeUpdateSchema } from './wardrobe.schemas';
import * as wardrobeService from './wardrobe.service';

export async function createItem(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = wardrobeCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  const item = await wardrobeService.createItem(req.user.userId, parsed.data);
  return res.status(201).json(item);
}

export async function listItems(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = wardrobeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten() });
  }

  const items = await wardrobeService.listItems(req.user.userId, parsed.data);
  return res.status(200).json(items);
}

export async function updateItem(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = wardrobeUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  try {
    const item = await wardrobeService.updateItem(req.user.userId, Number(req.params.id), parsed.data);
    return res.status(200).json(item);
  } catch (error) {
    return res.status(404).json({ message: error instanceof Error ? error.message : 'Not found' });
  }
}

export async function deleteItem(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    await wardrobeService.deleteItem(req.user.userId, Number(req.params.id));
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: error instanceof Error ? error.message : 'Not found' });
  }
}
