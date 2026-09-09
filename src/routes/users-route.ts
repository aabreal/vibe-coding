import { Elysia, t } from 'elysia';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/users-service.ts';

const registerUserBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  email: t.String({ minLength: 1, maxLength: 255, format: 'email' }),
  password: t.String({ minLength: 1, maxLength: 255 }),
});

const loginUserBody = t.Object({
  email: t.String({ minLength: 1, maxLength: 255 }),
  password: t.String({ minLength: 1, maxLength: 255 }),
});

export const usersRoute = new Elysia({ prefix: '/api' }).post(
  '/users',
  async ({ body, set }) => {
    const result = await registerUser(body);

    if (!result.ok) {
      set.status = 409;
      return { error: 'email sudah terdaftar' };
    }

    set.status = 201;
    return { data: 'ok' };
  },
  {
    body: registerUserBody,
    detail: {
      tags: ['Users'],
      summary: 'Register a user',
      description: 'Membuat user baru dan menyimpan password sebagai bcrypt hash.',
    },
  },
);

usersRoute.post(
  '/users/login',
  async ({ body, set }) => {
    const result = await loginUser(body);

    if (!result.ok) {
      set.status = 401;
      return { error: 'email atau password salah' };
    }

    return { data: result.token };
  },
  {
    body: loginUserBody,
    detail: {
      tags: ['Authentication'],
      summary: 'Log in a user',
      description: 'Memverifikasi kredensial dan membuat UUID session token.',
    },
  },
);

usersRoute.get(
  '/users/current',
  async ({ headers, set }) => {
    const authorization = headers.authorization;
    const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i);

    const token = bearerMatch?.[1];
    if (!token) {
      set.status = 401;
      return { error: 'unauthorized' };
    }

    const result = await getCurrentUser(token);
    if (!result.ok) {
      set.status = 401;
      return { error: 'unauthorized' };
    }

    return {
      data: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        created_at: result.user.createdAt,
      },
    };
  },
  {
    detail: {
      tags: ['Authentication'],
      summary: 'Get the current user',
      security: [{ bearerAuth: [] }],
    },
  },
);

usersRoute.delete(
  '/users/logout',
  async ({ headers, set }) => {
    const authorization = headers.authorization;
    const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i);
    const token = bearerMatch?.[1];

    if (!token) {
      set.status = 401;
      return { error: 'unauthorized' };
    }

    const result = await logoutUser(token);
    if (!result.ok) {
      set.status = 401;
      return { error: 'unauthorized' };
    }

    return { data: 'ok' };
  },
  {
    detail: {
      tags: ['Authentication'],
      summary: 'Log out a user',
      security: [{ bearerAuth: [] }],
    },
  },
);
