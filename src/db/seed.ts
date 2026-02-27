import { getPool, sql } from './sql';

async function seed() {
  const pool = await getPool();

  const quizTemplate = [
    {
      dimension: 'style',
      questionText: 'Which style best describes you?',
      answers: [
        { answerText: 'Streetwear', scoreWeight: 4 },
        { answerText: 'Minimalist', scoreWeight: 3 },
        { answerText: 'Classic', scoreWeight: 2 },
      ],
    },
    {
      dimension: 'color',
      questionText: 'Preferred color palette?',
      answers: [
        { answerText: 'Bold', scoreWeight: 4 },
        { answerText: 'Pastel', scoreWeight: 3 },
        { answerText: 'Neutral', scoreWeight: 2 },
      ],
    },
    {
      dimension: 'fit',
      questionText: 'What fit do you usually prefer?',
      answers: [
        { answerText: 'Relaxed', scoreWeight: 3 },
        { answerText: 'Slim', scoreWeight: 3 },
        { answerText: 'Athletic', scoreWeight: 3 },
      ],
    },
    {
      dimension: 'budget',
      questionText: 'What is your usual fashion budget?',
      answers: [
        { answerText: 'Budget-friendly', scoreWeight: 2 },
        { answerText: 'Mid-range', scoreWeight: 3 },
        { answerText: 'Premium', scoreWeight: 4 },
      ],
    },
  ];

  for (const question of quizTemplate) {
    const existingQuestion = await pool
      .request()
      .input('dimension', sql.NVarChar(80), question.dimension)
      .query(`
        SELECT TOP 1 id
        FROM style_quiz_questions
        WHERE dimension = @dimension
        ORDER BY id ASC
      `);

    let questionId: number;
    if (existingQuestion.recordset.length === 0) {
      const insertedQuestion = await pool
        .request()
        .input('questionText', sql.NVarChar(255), question.questionText)
        .input('dimension', sql.NVarChar(80), question.dimension)
        .query(`
          INSERT INTO style_quiz_questions (question_text, dimension, is_active)
          OUTPUT INSERTED.id
          VALUES (@questionText, @dimension, 1)
        `);
      questionId = insertedQuestion.recordset[0].id;
    } else {
      questionId = existingQuestion.recordset[0].id;
      await pool
        .request()
        .input('questionText', sql.NVarChar(255), question.questionText)
        .input('questionId', sql.Int, questionId)
        .query('UPDATE style_quiz_questions SET question_text = @questionText, is_active = 1 WHERE id = @questionId');
    }

    for (const answer of question.answers) {
      const existingAnswer = await pool
        .request()
        .input('questionId', sql.Int, questionId)
        .input('answerText', sql.NVarChar(255), answer.answerText)
        .query(`
          SELECT TOP 1 id
          FROM style_quiz_answers
          WHERE question_id = @questionId AND answer_text = @answerText
          ORDER BY id ASC
        `);

      if (existingAnswer.recordset.length === 0) {
        await pool
          .request()
          .input('questionId', sql.Int, questionId)
          .input('answerText', sql.NVarChar(255), answer.answerText)
          .input('scoreWeight', sql.Int, answer.scoreWeight)
          .query(`
            INSERT INTO style_quiz_answers (question_id, answer_text, score_weight)
            VALUES (@questionId, @answerText, @scoreWeight)
          `);
      } else {
        await pool
          .request()
          .input('scoreWeight', sql.Int, answer.scoreWeight)
          .input('answerId', sql.Int, existingAnswer.recordset[0].id)
          .query('UPDATE style_quiz_answers SET score_weight = @scoreWeight WHERE id = @answerId');
      }
    }
  }

  const pCount = await pool.request().query('SELECT COUNT(*) AS c FROM products');
  if (pCount.recordset[0].c === 0) {
    await pool.request().query(`
      INSERT INTO products (provider, title, category, price, currency, product_url, image_url, is_active)
      VALUES
      ('FashionHub', 'Classic Denim Jacket', 'Outerwear', 89.99, 'CAD', 'https://example.com/denim-jacket', 'https://picsum.photos/seed/denim/400/400', 1),
      ('UrbanFits', 'Wide Leg Trousers', 'Bottoms', 64.00, 'CAD', 'https://example.com/trousers', 'https://picsum.photos/seed/trousers/400/400', 1),
      ('StyleNow', 'White Sneaker Low', 'Shoes', 110.50, 'CAD', 'https://example.com/sneakers', 'https://picsum.photos/seed/sneaker/400/400', 1)
    `);
  }

  const bCount = await pool.request().query('SELECT COUNT(*) AS c FROM blog_posts');
  if (bCount.recordset[0].c === 0) {
    await pool.request().query(`
      INSERT INTO blog_posts (title, summary, content, topic, image_url, published_at, is_published)
      VALUES
      ('Spring Capsule Wardrobe Essentials', 'Build a versatile spring lineup with fewer pieces.', 'Focus on layering pieces, neutral colors, and one statement accessory.', 'spring', 'https://picsum.photos/seed/spring-blog/800/400', SYSUTCDATETIME(), 1),
      ('How to Mix Streetwear with Smart Casual', 'Practical combinations for daily outfits.', 'Pair clean sneakers with structured tops and tailored bottoms.', 'streetwear', 'https://picsum.photos/seed/street-blog/800/400', SYSUTCDATETIME(), 1)
    `);
  }

  console.log('Seed complete');
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
