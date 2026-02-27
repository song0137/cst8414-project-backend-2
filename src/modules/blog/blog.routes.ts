import { Router } from 'express';
import { getPool, sql } from '../../db/sql';

const router = Router();

router.get('/posts', async (req, res) => {
  const topic = req.query.topic as string | undefined;
  const pool = await getPool();
  const request = pool.request();

  let where = 'WHERE is_published = 1';
  if (topic) {
    request.input('topic', sql.NVarChar(100), topic);
    where += ' AND topic = @topic';
  }

  const posts = await request.query(`SELECT * FROM blog_posts ${where} ORDER BY published_at DESC`);
  return res.status(200).json(posts.recordset);
});

export default router;
