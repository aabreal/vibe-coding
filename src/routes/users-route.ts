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
  },
);

usersRoute.get('/users/current', async ({ headers, set }) => {
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
});

usersRoute.delete('/users/logout', async ({ headers, set }) => {
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
});
