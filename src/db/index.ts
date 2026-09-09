import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { env, isDbConfigured } from '../config/env.ts';
import * as schema from './schema.ts';

const pool = mysql.createPool({
  host: env.mysqlHost,
  port: env.mysqlPort,
  user: env.mysqlUser,
  password: env.mysqlPassword,
  database: env.mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema, mode: 'default' });

export async function ensureDatabaseReady() {
  if (!isDbConfigured) {
    return {
      ready: false,
      message: 'MySQL is not configured yet. Add MYSQL_* variables in the environment to enable DB access.',
    };
  }

  try {
    await pool.query('SELECT 1 AS ok');
    return {
      ready: true,
      message: 'MySQL connection is ready.',
    };
  } catch (error) {
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Failed to connect to MySQL.',
    };
  }
}

export { schema };
