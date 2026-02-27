import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../../db/sql';

const router = Router();

const shareSchema = z.object({
  platform: z.string().min(1),
  privacySetting: z.enum(['public', 'friends', 'private']),
  outfitPayload: z.record(z.string(), z.unknown()),
});

router.post('/share', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, req.user.userId)
    .input('platform', sql.NVarChar(50), parsed.data.platform)
    .input('privacySetting', sql.NVarChar(30), parsed.data.privacySetting)
    .input('outfitPayload', sql.NVarChar(sql.MAX), JSON.stringify(parsed.data.outfitPayload))
    .query(`
      INSERT INTO social_shares (user_id, platform, privacy_setting, outfit_payload)
      OUTPUT INSERTED.*
      VALUES (@userId, @platform, @privacySetting, @outfitPayload)
    `);

  return res.status(201).json(result.recordset[0]);
});

export default router;
