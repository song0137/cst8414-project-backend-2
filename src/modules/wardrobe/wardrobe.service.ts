import { getPool, sql } from '../../db/sql';

type WardrobeCreate = {
  name: string;
  category: string;
  color: string;
  season: string;
  brand: string;
  imageUrl?: string;
};

type WardrobeUpdate = Partial<WardrobeCreate>;

type WardrobeQuery = {
  category?: string;
  color?: string;
  season?: string;
  q?: string;
};

export async function createItem(userId: number, input: WardrobeCreate) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('name', sql.NVarChar(150), input.name)
    .input('category', sql.NVarChar(100), input.category)
    .input('color', sql.NVarChar(100), input.color)
    .input('season', sql.NVarChar(100), input.season)
    .input('brand', sql.NVarChar(120), input.brand)
    .input('imageUrl', sql.NVarChar(500), input.imageUrl ?? null)
    .query(`
      INSERT INTO wardrobe_items (user_id, name, category, color, season, brand, image_url)
      OUTPUT INSERTED.*
      VALUES (@userId, @name, @category, @color, @season, @brand, @imageUrl)
    `);

  return result.recordset[0];
}

export async function listItems(userId: number, query: WardrobeQuery) {
  const pool = await getPool();
  const req = pool.request().input('userId', sql.Int, userId);

  let where = 'WHERE user_id = @userId';

  if (query.category) {
    req.input('category', sql.NVarChar(100), query.category);
    where += ' AND category = @category';
  }
  if (query.color) {
    req.input('color', sql.NVarChar(100), query.color);
    where += ' AND color = @color';
  }
  if (query.season) {
    req.input('season', sql.NVarChar(100), query.season);
    where += ' AND season = @season';
  }
  if (query.q) {
    req.input('q', sql.NVarChar(150), `%${query.q}%`);
    where += ' AND (name LIKE @q OR brand LIKE @q OR category LIKE @q)';
  }

  const result = await req.query(`SELECT * FROM wardrobe_items ${where} ORDER BY created_at DESC`);
  return result.recordset;
}

export async function updateItem(userId: number, id: number, input: WardrobeUpdate) {
  const pool = await getPool();

  const check = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT id, user_id FROM wardrobe_items WHERE id = @id');

  const current = check.recordset[0];
  if (!current || current.user_id !== userId) {
    throw new Error('Item not found');
  }

  const updates: string[] = [];
  const req = pool.request().input('id', sql.Int, id);

  if (input.name !== undefined) {
    req.input('name', sql.NVarChar(150), input.name);
    updates.push('name = @name');
  }
  if (input.category !== undefined) {
    req.input('category', sql.NVarChar(100), input.category);
    updates.push('category = @category');
  }
  if (input.color !== undefined) {
    req.input('color', sql.NVarChar(100), input.color);
    updates.push('color = @color');
  }
  if (input.season !== undefined) {
    req.input('season', sql.NVarChar(100), input.season);
    updates.push('season = @season');
  }
  if (input.brand !== undefined) {
    req.input('brand', sql.NVarChar(120), input.brand);
    updates.push('brand = @brand');
  }
  if (input.imageUrl !== undefined) {
    req.input('imageUrl', sql.NVarChar(500), input.imageUrl ?? null);
    updates.push('image_url = @imageUrl');
  }

  if (updates.length === 0) {
    const unchanged = await pool.request().input('id', sql.Int, id).query('SELECT * FROM wardrobe_items WHERE id = @id');
    return unchanged.recordset[0];
  }

  const result = await req.query(`
    UPDATE wardrobe_items
    SET ${updates.join(', ')}, updated_at = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0];
}

export async function deleteItem(userId: number, id: number) {
  const pool = await getPool();
  const check = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT id, user_id FROM wardrobe_items WHERE id = @id');

  const current = check.recordset[0];
  if (!current || current.user_id !== userId) {
    throw new Error('Item not found');
  }

  await pool.request().input('id', sql.Int, id).query('DELETE FROM wardrobe_items WHERE id = @id');
}
