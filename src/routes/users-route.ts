import { Elysia, t } from 'elysia';

import { loginUser, registerUser } from '../services/users-service.ts';

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
