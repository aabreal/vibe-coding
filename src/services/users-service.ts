import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

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
