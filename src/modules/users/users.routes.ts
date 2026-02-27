import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getPool, sql } from '../../db/sql';

const router = Router();

router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.user.userId)
    .query('SELECT id, email, display_name, created_at FROM users WHERE id = @id');

  const user = result.recordset[0];
  if (!user) return res.status(404).json({ message: 'User not found' });

  return res.status(200).json({
    id: user.id,
    username: user.email,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
  });
});

export default router;
