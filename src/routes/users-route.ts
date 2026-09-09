import { Elysia, t } from 'elysia';

import { registerUser } from '../services/users-service.ts';

const registerUserBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  email: t.String({ minLength: 1, maxLength: 255, format: 'email' }),
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
