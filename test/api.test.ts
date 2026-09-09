import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq, like } from 'drizzle-orm';

import { app } from '../src/app.ts';
import { db, schema } from '../src/db/index.ts';

const testEmailPrefix = 'bun-test-';
const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === '1';

async function request(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return app.handle(new Request(`http://localhost${path}`, init));
}

async function cleanupTestData() {
  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(like(schema.users.email, `${testEmailPrefix}%`));

  for (const user of users) {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  }

  await db
    .delete(schema.users)
    .where(like(schema.users.email, `${testEmailPrefix}%`));
}

describe('public API validation', () => {
  test('serves Swagger UI and OpenAPI JSON', async () => {
    const uiResponse = await request('/swagger');
    const specificationResponse = await request('/swagger/json');
    const specification = (await specificationResponse.json()) as {
      openapi?: string;
      paths?: Record<string, unknown>;
      components?: { securitySchemes?: Record<string, unknown> };
    };

    expect(uiResponse.status).toBe(200);
    expect(specificationResponse.status).toBe(200);
    expect(specification.openapi).toBe('3.0.3');
    expect(specification.paths).toHaveProperty('/api/users');
    expect(specification.paths).toHaveProperty('/api/users/login');
    expect(specification.paths).toHaveProperty('/api/users/current');
    expect(specification.paths).toHaveProperty('/api/users/logout');
    expect(specification.components?.securitySchemes).toHaveProperty(
      'bearerAuth',
    );
  });

  test('returns the API status from the root endpoint', async () => {
    const response = await request('/');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect((body as { status?: string }).status).toBe('running');
  });

  test('rejects registration data that exceeds 255 characters', async () => {
    const response = await request('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'a'.repeat(256),
        email: 'validation@example.com',
        password: 'valid-password',
      }),
    });

    expect(response.status).toBe(422);
  });

  test('rejects incomplete registration data', async () => {
    const response = await request('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(422);
  });

  test('rejects incomplete login data', async () => {
    const response = await request('/api/users/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'validation@example.com' }),
    });

    expect(response.status).toBe(422);
  });

  test('rejects current-user requests without a Bearer token', async () => {
    const response = await request('/api/users/current');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
  });

  test('rejects logout requests without a Bearer token', async () => {
    const response = await request('/api/users/logout', { method: 'DELETE' });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
  });
});

describe
  .skipIf(!integrationEnabled)
  .serial('database API integration', () => {
    beforeEach(cleanupTestData);
    afterAll(cleanupTestData);

    test('registers a user and stores a hashed password', async () => {
      const email = `${testEmailPrefix}register@example.com`;
      const response = await request('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email,
          password: 'secret-password',
        }),
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ data: 'ok' });

      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email));
      expect(user?.password).not.toBe('secret-password');
      expect(user?.password).toMatch(/^\$2[aby]\$/);
    });

    test('rejects duplicate registration emails', async () => {
      const email = `${testEmailPrefix}duplicate@example.com`;
      await request('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email, password: 'secret' }),
      });

      const response = await request('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Other User', email, password: 'secret' }),
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: 'email sudah terdaftar' });
    });

    test('logs in, resolves the current user, and logs out', async () => {
      const email = `${testEmailPrefix}flow@example.com`;
      await request('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Flow User', email, password: 'secret' }),
      });

      const loginResponse = await request('/api/users/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'secret' }),
      });
      const loginBody = (await loginResponse.json()) as { data?: string };
      const token = loginBody.data as string;

      expect(loginResponse.status).toBe(200);
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );

      const currentResponse = await request('/api/users/current', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(currentResponse.status).toBe(200);
      expect(await currentResponse.json()).toMatchObject({
        data: { name: 'Flow User', email },
      });

      const logoutResponse = await request('/api/users/logout', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(logoutResponse.status).toBe(200);
      expect(await logoutResponse.json()).toEqual({ data: 'ok' });

      const currentAfterLogout = await request('/api/users/current', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(currentAfterLogout.status).toBe(401);
    });

    test('rejects invalid login credentials', async () => {
      const response = await request('/api/users/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${testEmailPrefix}unknown@example.com`,
          password: 'wrong',
        }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'email atau password salah',
      });
    });
  });
