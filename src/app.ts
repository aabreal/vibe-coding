import { Elysia } from 'elysia';

import { db, ensureDatabaseReady, schema } from './db/index.ts';
import { usersRoute } from './routes/users-route.ts';

export const app = new Elysia().use(usersRoute);

app.get('/', () => ({
  name: 'vibe-coding-api',
  status: 'running',
  message: 'Welcome to the Bun + Elysia + Drizzle + MySQL starter project.',
}));

app.get('/health', async () => {
  const dbStatus = await ensureDatabaseReady();

  return {
    status: dbStatus.ready ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };
});

app.get('/api/users', async () => {
  if (!db) {
    return {
      message: 'Database client is not available.',
      users: [],
    };
  }

  try {
    const users = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users);

    return {
      users,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Failed to fetch users.',
      users: [],
    };
  }
});
