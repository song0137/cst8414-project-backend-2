import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { getPool, sql } from '../../db/sql';
import {
  buildFeedbackWeights,
  buildProductMatchReasons,
  mapQuizRowsToProfile,
  scoreProductCandidate,
} from '../recommendations/recommendation.engine';
import { sortAndFilterShoppingSuggestions, type ShoppingSortMode } from './shopping.utils';

const router = Router();

router.get('/suggestions', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const sortParam = String(req.query.sort ?? 'personalized');
  const sort: ShoppingSortMode = ['personalized', 'top-rated', 'price-low', 'price-high'].includes(sortParam)
    ? (sortParam as ShoppingSortMode)
    : 'personalized';
  const minRatingValue = req.query.minRating ? Number(req.query.minRating) : undefined;
  const minRating = Number.isFinite(minRatingValue) ? minRatingValue : undefined;

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

  const products = await pool.request().query(`
    SELECT
      p.id,
      p.provider,
      p.title,
      p.category,
      p.price,
      p.currency,
      p.product_url,
      p.image_url,
      CAST(AVG(CAST(r.rating AS FLOAT)) AS FLOAT) AS average_rating,
      COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r
      ON r.target_type = 'product'
     AND r.target_id = p.id
    WHERE p.is_active = 1
    GROUP BY
      p.id,
      p.provider,
      p.title,
      p.category,
      p.price,
      p.currency,
      p.product_url,
      p.image_url
  `);

  const suggestions = sortAndFilterShoppingSuggestions(
    products.recordset
    .map((product) => {
      const averageRating =
        typeof product.average_rating === 'number'
          ? Math.round(product.average_rating * 10) / 10
          : null;
      const reviewCount = Number(product.review_count ?? 0);
      const score = scoreProductCandidate(
        {
          category: product.category,
          title: product.title,
          price: product.price,
          averageRating,
          reviewCount,
        },
        profile,
        feedbackWeights,
      );
      const matchReasons = buildProductMatchReasons(
        {
          category: product.category,
          title: product.title,
          price: product.price,
          averageRating,
          reviewCount,
        },
        profile,
        feedbackWeights,
      );

      return {
        id: product.id,
        provider: product.provider,
        title: product.title,
        category: product.category,
        price: product.price,
        currency: product.currency,
        productUrl: product.product_url,
        imageUrl: product.image_url,
        averageRating,
        reviewCount,
        score,
        matchReasons:
          matchReasons.length > 0 ? matchReasons : ['Selected from the best available catalog matches'],
      };
    }),
    { sort, minRating },
  ).slice(0, 12);

  return res.status(200).json(suggestions);
});

export default router;
