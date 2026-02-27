const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

(async () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'sql', 'init.sql'), 'utf8');
  const match = process.env.DATABASE_URL.match(/^sqlserver:\/\/(.+?):(.+?)@([^:;]+):?(\d+)?;database=([^;]+);/);
  if (!match) throw new Error('Invalid DATABASE_URL format for script parser');

  const [, user, password, server, portStr, database] = match;
  const pool = await sql.connect({
    user,
    password,
    server,
    port: Number(portStr || 1433),
    database,
    options: { encrypt: true, trustServerCertificate: false },
    requestTimeout: 60000,
    connectionTimeout: 30000,
  });
  await pool.request().batch(script);
  await pool.close();
  console.log('Schema applied successfully');
})();
