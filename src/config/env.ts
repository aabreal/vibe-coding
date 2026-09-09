import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mysqlHost: process.env.MYSQL_HOST ?? 'localhost',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
  mysqlDatabase: process.env.MYSQL_DATABASE ?? 'app_db',
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? '',
};

export const isDbConfigured = Boolean(
  process.env.MYSQL_HOST || process.env.MYSQL_DATABASE || process.env.MYSQL_USER,
);
