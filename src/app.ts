import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';

import { db, ensureDatabaseReady, schema } from './db/index.ts';
import { usersRoute } from './routes/users-route.ts';

export const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Vibe Coding API',
          version: '1.0.0',
          description:
            'API untuk registrasi user, autentikasi berbasis session, dan pengelolaan user.',
        },
        tags: [
          { name: 'System', description: 'Status aplikasi dan database.' },
          { name: 'Users', description: 'Registrasi dan pengelolaan user.' },
          { name: 'Authentication', description: 'Login dan session user.' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'UUID',
            },
          },
        },
      },
      path: '/swagger',
      specPath: '/swagger/json',
      provider: 'swagger-ui',
    }),
  )
  .use(usersRoute);

app.get(
  '/',
  () => ({
    name: 'vibe-coding-api',
    status: 'running',
    message: 'Welcome to the Bun + Elysia + Drizzle + MySQL starter project.',
  }),
  {
    detail: {
      tags: ['System'],
      summary: 'Get API status',
      description: 'Mengembalikan informasi dasar bahwa API sedang berjalan.',
    },
  },
);

app.get(
  '/health',
  async () => {
    const dbStatus = await ensureDatabaseReady();

    return {
      status: dbStatus.ready ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  },
  {
    detail: {
      tags: ['System'],
      summary: 'Check API and database health',
    },
  },
);

app.get(
  '/api/users',
  async () => {
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
        message:
          error instanceof Error ? error.message : 'Failed to fetch users.',
        users: [],
      };
    }
  },
  {
    detail: {
      tags: ['Users'],
      summary: 'List users',
      description: 'Mengembalikan daftar user tanpa password.',
    },
  },
);
