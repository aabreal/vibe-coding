import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';

import { db, schema } from '../db/index.ts';

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterUserResult =
  | { ok: true }
  | { ok: false; reason: 'email_taken' };

export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const existingUser = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { ok: false, reason: 'email_taken' };
  }

  const passwordHash = await hash(input.password, 10);

  try {
    await db.insert(schema.users).values({
      name: input.name,
      email: input.email,
      password: passwordHash,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      return { ok: false, reason: 'email_taken' };
    }

    throw error;
  }

  return { ok: true };
}

export type LoginUserInput = {
  email: string;
  password: string;
};

export type LoginUserResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'invalid_credentials' };

export async function loginUser(
  input: LoginUserInput,
): Promise<LoginUserResult> {
  const matchingUsers = await db
    .select({
      id: schema.users.id,
      password: schema.users.password,
    })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  const user = matchingUsers[0];
  if (!user || !(await compare(input.password, user.password))) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const token = crypto.randomUUID();
  await db.insert(schema.sessions).values({
    token,
    userId: user.id,
  });

  return { ok: true, token };
}

export type CurrentUserResult =
  | {
      ok: true;
      user: {
        id: number;
        name: string;
        email: string;
        createdAt: Date;
      };
    }
  | { ok: false; reason: 'unauthorized' };

export async function getCurrentUser(
  token: string,
): Promise<CurrentUserResult> {
  const matchingUsers = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.token, token))
    .limit(1);

  const user = matchingUsers[0];
  if (!user) {
    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: true, user };
}

export type LogoutUserResult =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' };

export async function logoutUser(token: string): Promise<LogoutUserResult> {
  const [deletedSessions] = await db
    .delete(schema.sessions)
    .where(eq(schema.sessions.token, token));

  if (deletedSessions.affectedRows === 0) {
    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: true };
}
