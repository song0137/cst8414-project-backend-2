import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../../db/sql';
import {
  buildFeedbackWeights,
  mapQuizRowsToProfile,
  scoreProductCandidate,
  scoreWardrobeCandidate,
} from './recommendation.engine';

const router = Router();

router.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const pool = await getPool();
  const userId = req.user.userId;

  const quizRowsResult = await pool.request().input('userId', sql.Int, userId).query(`
    WITH latest_responses AS (
      SELECT
        r.question_id,
        r.answer_id,
        ROW_NUMBER() OVER (PARTITION BY r.question_id ORDER BY r.created_at DESC, r.id DESC) AS rn
      FROM user_quiz_responses r
      WHERE r.user_id = @userId
    )
    SELECT q.dimension, a.answer_text, a.score_weight
    FROM latest_responses lr
    INNER JOIN style_quiz_questions q ON q.id = lr.question_id
    INNER JOIN style_quiz_answers a ON a.id = lr.answer_id
    WHERE lr.rn = 1
  `);

  const profile = mapQuizRowsToProfile(
    quizRowsResult.recordset.map((row) => ({
      dimension: row.dimension,
      answerText: row.answer_text,
      scoreWeight: row.score_weight,
    })),
  );

  const feedbackRows = await pool.request().input('userId', sql.Int, userId).query(`
    SELECT
      COALESCE(p.category, w.category) AS category,
      f.feedback_type
    FROM recommendation_feedback f
    INNER JOIN recommendation_items ri ON ri.id = f.recommendation_item_id
    LEFT JOIN products p ON p.id = ri.product_id
    LEFT JOIN wardrobe_items w ON w.id = ri.wardrobe_item_id
    WHERE f.user_id = @userId
  `);
  const feedbackWeights = buildFeedbackWeights(
    feedbackRows.recordset.map((row) => ({
      category: row.category,
      feedbackType: row.feedback_type,
    })),
  );

  const wardrobe = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query('SELECT TOP 50 * FROM wardrobe_items WHERE user_id = @userId ORDER BY created_at DESC');

  const products = await pool
    .request()
    .query('SELECT TOP 50 * FROM products WHERE is_active = 1 ORDER BY id DESC');

  const rankedWardrobe = wardrobe.recordset.map((item) => ({
    itemType: 'wardrobe' as const,
    wardrobeItemId: item.id as number,
    productId: null as number | null,
    score: scoreWardrobeCandidate(
      { category: item.category, color: item.color, season: item.season },
      profile,
      feedbackWeights,
    ),
  }));

  const rankedProducts = products.recordset.map((product) => ({
    itemType: 'product' as const,
    wardrobeItemId: null as number | null,
    productId: product.id as number,
    score: scoreProductCandidate(
      { category: product.category, title: product.title, price: product.price },
      profile,
      feedbackWeights,
    ),
  }));

  const rankedItems = [...rankedWardrobe, ...rankedProducts]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const runResult = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('source', sql.NVarChar(80), 'quiz+wardrobe')
    .query(`
      INSERT INTO recommendation_runs (user_id, source)
      OUTPUT INSERTED.id
      VALUES (@userId, @source)
    `);

  const runId = runResult.recordset[0].id;
  let rank = 1;

  for (const item of rankedItems) {
    await pool
      .request()
      .input('runId', sql.Int, runId)
      .input('itemType', sql.NVarChar(30), item.itemType)
      .input('productId', sql.Int, item.productId)
      .input('wardrobeItemId', sql.Int, item.wardrobeItemId)
      .input('score', sql.Float, item.score)
      .input('rankOrder', sql.Int, rank++)
      .query(`
        INSERT INTO recommendation_items (run_id, item_type, product_id, wardrobe_item_id, score, rank_order)
        VALUES (@runId, @itemType, @productId, @wardrobeItemId, @score, @rankOrder)
      `);
  }

  const itemsResult = await pool
    .request()
    .input('runId', sql.Int, runId)
    .query(`
      SELECT
        ri.id,
        ri.item_type,
        ri.score,
        ri.rank_order,
        ri.product_id,
        ri.wardrobe_item_id,
        p.title AS product_title,
        p.category AS product_category,
        p.price AS product_price,
        p.currency AS product_currency,
        p.provider AS product_provider,
        p.image_url AS product_image_url,
        p.product_url AS product_url,
        w.name AS wardrobe_name,
        w.category AS wardrobe_category,
        w.color AS wardrobe_color,
        w.season AS wardrobe_season,
        w.brand AS wardrobe_brand,
        w.image_url AS wardrobe_image_url
      FROM recommendation_items ri
      LEFT JOIN products p ON p.id = ri.product_id
      LEFT JOIN wardrobe_items w ON w.id = ri.wardrobe_item_id
      WHERE ri.run_id = @runId
      ORDER BY ri.rank_order ASC
    `);

  const items = itemsResult.recordset.map((row) => {
    const isProduct = row.item_type === 'product';
    return {
      id: row.id,
      itemType: row.item_type,
      score: row.score,
      rankOrder: row.rank_order,
      category: isProduct ? row.product_category : row.wardrobe_category,
      title: isProduct ? row.product_title : row.wardrobe_name,
      color: isProduct ? null : row.wardrobe_color,
      season: isProduct ? null : row.wardrobe_season,
      brand: isProduct ? row.product_provider : row.wardrobe_brand,
      price: isProduct ? row.product_price : null,
      currency: isProduct ? row.product_currency : null,
      imageUrl: isProduct ? row.product_image_url : row.wardrobe_image_url,
      productUrl: isProduct ? row.product_url : null,
    };
  });

  return res.status(200).json({ runId, profile, items });
});

const feedbackSchema = z.object({
  feedbackType: z.enum(['like', 'dislike']),
});

router.post('/:id/feedback', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  const pool = await getPool();
  const recommendationItemId = Number(req.params.id);
  if (!Number.isInteger(recommendationItemId) || recommendationItemId <= 0) {
    return res.status(400).json({ message: 'Invalid recommendation item id' });
  }

  const ownership = await pool
    .request()
    .input('userId', sql.Int, req.user.userId)
    .input('recommendationItemId', sql.Int, recommendationItemId)
    .query(`
      SELECT ri.id
      FROM recommendation_items ri
      INNER JOIN recommendation_runs rr ON rr.id = ri.run_id
      WHERE ri.id = @recommendationItemId
        AND rr.user_id = @userId
    `);

  if (ownership.recordset.length === 0) {
    return res.status(404).json({ message: 'Recommendation item not found for this user' });
  }

  const updateResult = await pool
    .request()
    .input('userId', sql.Int, req.user.userId)
    .input('recommendationItemId', sql.Int, recommendationItemId)
    .input('feedbackType', sql.NVarChar(20), parsed.data.feedbackType)
    .query(`
      UPDATE recommendation_feedback
      SET feedback_type = @feedbackType, created_at = SYSUTCDATETIME()
      WHERE user_id = @userId AND recommendation_item_id = @recommendationItemId
    `);

  if ((updateResult.rowsAffected[0] ?? 0) === 0) {
    await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .input('recommendationItemId', sql.Int, recommendationItemId)
      .input('feedbackType', sql.NVarChar(20), parsed.data.feedbackType)
      .query(`
        INSERT INTO recommendation_feedback (user_id, recommendation_item_id, feedback_type)
        VALUES (@userId, @recommendationItemId, @feedbackType)
      `);
  }

  return res.status(201).json({ message: 'Feedback captured' });
});

export default router;
