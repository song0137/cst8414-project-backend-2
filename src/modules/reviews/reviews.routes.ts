import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../../db/sql';

const router = Router();

const createReviewSchema = z.object({
  targetType: z.enum(['product', 'outfit']),
  targetId: z.number().int(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, req.user.userId)
    .input('targetType', sql.NVarChar(30), parsed.data.targetType)
    .input('targetId', sql.Int, parsed.data.targetId)
    .input('rating', sql.Int, parsed.data.rating)
    .input('comment', sql.NVarChar(500), parsed.data.comment)
    .query(`
      INSERT INTO reviews (user_id, target_type, target_id, rating, comment)
      OUTPUT INSERTED.*
      VALUES (@userId, @targetType, @targetId, @rating, @comment)
    `);

  return res.status(201).json(result.recordset[0]);
});

router.get('/', async (req, res: Response) => {
  const targetType = req.query.targetType as string | undefined;
  const targetId = req.query.targetId ? Number(req.query.targetId) : undefined;
  const pool = await getPool();
  const request = pool.request();

  let where = 'WHERE 1=1';
  if (targetType) {
    request.input('targetType', sql.NVarChar(30), targetType);
    where += ' AND target_type = @targetType';
  }
  if (targetId) {
    request.input('targetId', sql.Int, targetId);
    where += ' AND target_id = @targetId';
  }

  const result = await request.query(`SELECT * FROM reviews ${where} ORDER BY rating DESC, created_at DESC`);
  return res.status(200).json(result.recordset);
});

export default router;
