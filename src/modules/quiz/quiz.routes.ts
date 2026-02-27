import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { Response } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../../db/sql';
import { summarizeQuizSubmission } from './quiz.validation';

const router = Router();

router.get('/questions', requireAuth, async (_req: AuthRequest, res: Response) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT q.id AS question_id, q.question_text, q.dimension, q.is_active,
           a.id AS answer_id, a.answer_text, a.score_weight
    FROM style_quiz_questions q
    LEFT JOIN style_quiz_answers a ON q.id = a.question_id
    WHERE q.is_active = 1
    ORDER BY q.id, a.id
  `);

  const grouped = new Map<number, any>();
  for (const row of result.recordset) {
    if (!grouped.has(row.question_id)) {
      grouped.set(row.question_id, {
        id: row.question_id,
        questionText: row.question_text,
        dimension: row.dimension,
        isActive: row.is_active,
        answers: [],
      });
    }
    if (row.answer_id) {
      grouped.get(row.question_id).answers.push({
        id: row.answer_id,
        answerText: row.answer_text,
        scoreWeight: row.score_weight,
      });
    }
  }

  return res.status(200).json([...grouped.values()]);
});

const responseSchema = z.object({
  responses: z.array(
    z.object({
      questionId: z.number().int(),
      answerId: z.number().int(),
    }),
  ).min(1),
});

router.post('/responses', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = responseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  const pool = await getPool();
  const activeQuestions = await pool
    .request()
    .query('SELECT id FROM style_quiz_questions WHERE is_active = 1 ORDER BY id');
  const activeQuestionIds = activeQuestions.recordset.map((row) => row.id as number);

  const summary = summarizeQuizSubmission(activeQuestionIds, parsed.data.responses);
  if (!summary.isValid) {
    return res.status(400).json({
      message: 'Quiz is incomplete or contains duplicate/invalid questions',
      details: summary,
    });
  }

  for (const response of parsed.data.responses) {
    const answerCheck = await pool
      .request()
      .input('questionId', sql.Int, response.questionId)
      .input('answerId', sql.Int, response.answerId)
      .query(`
        SELECT COUNT(*) AS c
        FROM style_quiz_answers
        WHERE question_id = @questionId AND id = @answerId
      `);
    if (answerCheck.recordset[0].c === 0) {
      return res.status(400).json({
        message: `Answer ${response.answerId} does not belong to question ${response.questionId}`,
      });
    }
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction)
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM user_quiz_responses WHERE user_id = @userId');

    for (const response of parsed.data.responses) {
      await new sql.Request(transaction)
        .input('userId', sql.Int, req.user.userId)
        .input('questionId', sql.Int, response.questionId)
        .input('answerId', sql.Int, response.answerId)
        .query(`
          INSERT INTO user_quiz_responses (user_id, question_id, answer_id)
          VALUES (@userId, @questionId, @answerId)
        `);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const profileRows = await pool
    .request()
    .input('userId', sql.Int, req.user.userId)
    .query(`
      SELECT q.dimension, a.answer_text, a.score_weight
      FROM user_quiz_responses r
      INNER JOIN style_quiz_questions q ON q.id = r.question_id
      INNER JOIN style_quiz_answers a ON a.id = r.answer_id
      WHERE r.user_id = @userId
      ORDER BY q.id ASC
    `);

  const profile = profileRows.recordset.reduce<Record<string, string>>((acc, row) => {
    acc[row.dimension] = row.answer_text;
    return acc;
  }, {});

  return res.status(201).json({ message: 'Responses saved', profile });
});

export default router;
