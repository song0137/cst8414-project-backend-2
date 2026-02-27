import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { getPool, sql } from '../../db/sql';

type RegisterInput = {
  username: string;
  password: string;
  displayName?: string;
};

type LoginInput = {
  username: string;
  password: string;
};

function signToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, env.JWT_SECRET, { expiresIn: '2h' });
}

function deriveDisplayName(username: string) {
  return username.trim().slice(0, 80) || 'StyleSavvy User';
}

export async function register(input: RegisterInput) {
  const pool = await getPool();
  const username = input.username.trim();

  const existing = await pool
    .request()
    .input('email', sql.NVarChar(255), username)
    .query('SELECT id FROM users WHERE email = @email');

  if (existing.recordset.length > 0) {
    throw new Error('Username already registered');
  }

  const displayName = input.displayName?.trim() || deriveDisplayName(username);

  const inserted = await pool
    .request()
    .input('email', sql.NVarChar(255), username)
    .input('passwordHash', sql.NVarChar(255), 'POC_AUTH_PASSWORD_IGNORED')
    .input('displayName', sql.NVarChar(80), displayName)
    .query(`
      INSERT INTO users (email, password_hash, display_name)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.display_name
      VALUES (@email, @passwordHash, @displayName)
    `);

  const user = inserted.recordset[0];
  const token = signToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, username: user.email, email: user.email, displayName: user.display_name },
  };
}

export async function login(input: LoginInput) {
  const pool = await getPool();
  const username = input.username.trim();

  let result = await pool
    .request()
    .input('email', sql.NVarChar(255), username)
    .query('SELECT id, email, password_hash, display_name FROM users WHERE email = @email');

  if (result.recordset.length === 0) {
    await pool
      .request()
      .input('email', sql.NVarChar(255), username)
      .input('passwordHash', sql.NVarChar(255), 'POC_AUTH_PASSWORD_IGNORED')
      .input('displayName', sql.NVarChar(80), deriveDisplayName(username))
      .query(`
        INSERT INTO users (email, password_hash, display_name)
        VALUES (@email, @passwordHash, @displayName)
      `);

    result = await pool
      .request()
      .input('email', sql.NVarChar(255), username)
      .query('SELECT id, email, password_hash, display_name FROM users WHERE email = @email');
  }

  const user = result.recordset[0];
  if (!user) throw new Error('Login failed');

  const token = signToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, username: user.email, email: user.email, displayName: user.display_name },
  };
}

export async function me(userId: number) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query('SELECT id, email, display_name FROM users WHERE id = @userId');

  const user = result.recordset[0];
  if (!user) {
    throw new Error('User not found');
  }

  return { id: user.id, username: user.email, email: user.email, displayName: user.display_name };
}
