# developer

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

Run the database migration after configuring the MySQL variables in `.env`:

```bash
bunx drizzle-kit migrate
```

The user registration endpoint is available at `POST /api/users`:

```json
{
  "name": "aab",
  "email": "aab@localhost",
  "password": "ajarkan"
}
```

Passwords are stored as bcrypt hashes and are never returned by the API.

Login is available at `POST /api/users/login`:

```json
{
  "email": "aab@localhost",
  "password": "ajarkan"
}
```

A successful login returns a UUID session token. Invalid credentials return
`401 Unauthorized` with `{ "error": "email atau password salah" }`.

The current authenticated user can be fetched with `GET /api/users/current`
using the login token:

```text
Authorization: Bearer <token>
```

Invalid or missing tokens return `401 Unauthorized`.

Logout is available at `DELETE /api/users/logout` with the same
`Authorization: Bearer <token>` header. A successful logout deletes the
session token and returns `{ "data": "ok" }`.
