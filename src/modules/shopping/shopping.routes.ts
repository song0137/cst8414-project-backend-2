import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { getPool } from '../../db/sql';

const router = Router();

router.get('/suggestions', requireAuth, async (_req: AuthRequest, res: Response) => {
  const pool = await getPool();
  const products = await pool.request().query('SELECT TOP 20 * FROM products WHERE is_active = 1 ORDER BY id DESC');
  return res.status(200).json(products.recordset);
});

export default router;
