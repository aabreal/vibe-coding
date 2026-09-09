# Vibe Coding API

Backend API sederhana untuk registrasi, autentikasi, session, dan pengelolaan
user. Project ini dibangun agar mudah dikembangkan dengan Bun, ElysiaJS,
Drizzle ORM, dan MySQL.

## Teknologi dan Library

- **Bun**: runtime JavaScript/TypeScript dan test runner.
- **TypeScript**: bahasa utama project.
- **ElysiaJS**: framework HTTP API.
- **Drizzle ORM**: definisi schema, query database, dan migration.
- **MySQL**: database relasional.
- **mysql2**: driver koneksi MySQL.
- **bcryptjs**: hashing dan verifikasi password.
- **dotenv**: membaca konfigurasi dari file environment.
- **drizzle-kit**: pembuatan dan eksekusi migration.

## Arsitektur Project

```text
.
├── index.ts                 # Entry point dan startup server
├── drizzle.config.ts        # Konfigurasi Drizzle Kit
├── package.json             # Script dan dependency project
├── bun.lock                 # Lockfile Bun
├── .env.example             # Contoh konfigurasi environment
├── drizzle/                 # Migration dan metadata schema
├── src/
│   ├── app.ts               # Inisialisasi Elysia dan endpoint umum
│   ├── config/
│   │   └── env.ts           # Pembacaan konfigurasi environment
│   ├── db/
│   │   ├── index.ts         # Koneksi MySQL dan instance Drizzle
│   │   └── schema.ts        # Definisi tabel database
│   ├── routes/
│   │   └── users-route.ts   # Routing dan validasi request user
│   └── services/
│       └── users-service.ts # Logic bisnis user dan session
└── test/
    └── api.test.ts          # Unit dan integration test API
```

### Konvensi Struktur dan Penamaan

- Route disimpan di `src/routes` dengan format `<resource>-route.ts`.
- Logic bisnis disimpan di `src/services` dengan format `<resource>-service.ts`.
- Schema dan akses database dipisahkan di `src/db`.
- Route bertanggung jawab atas path, validasi request, dan status response.
- Service bertanggung jawab atas query database, hashing password, dan logic bisnis.
- Test disimpan di folder `test` dan dijalankan menggunakan Bun test.

## Schema Database

### Tabel `users`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | integer | Primary key, auto increment |
| `name` | varchar(255) | Wajib diisi |
| `email` | varchar(255) | Wajib diisi dan unik |
| `password` | varchar(255) | Wajib diisi, berisi bcrypt hash |
| `created_at` | timestamp | Default waktu saat record dibuat |

### Tabel `sessions`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | integer | Primary key, auto increment |
| `token` | varchar(255) | UUID session, wajib diisi dan unik |
| `user_id` | integer | Foreign key ke `users.id` |
| `created_at` | timestamp | Default waktu saat session dibuat |

Session dihapus ketika user melakukan logout. Penghapusan user juga menghapus
session terkait melalui foreign key cascade.

## API yang Tersedia

### `GET /`

Mengembalikan informasi dasar bahwa API sedang berjalan.

### `GET /health`

Mengembalikan status aplikasi dan koneksi database.

### `GET /api/users`

Mengembalikan daftar user tanpa password.

### `POST /api/users`

Mendaftarkan user baru.

Request body:

```json
{
  "name": "aab",
  "email": "aab@localhost",
  "password": "ajarkan"
}
```

Password di-hash dengan bcrypt sebelum disimpan. Field `name`, `email`, dan
`password` memiliki batas maksimum 255 karakter.

Response sukses:

```json
{
  "data": "ok"
}
```

Email yang sudah terdaftar menghasilkan status `409 Conflict`.

### `POST /api/users/login`

Melakukan login dan membuat session baru.

Request body:

```json
{
  "email": "aab@localhost",
  "password": "ajarkan"
}
```

Response sukses berisi UUID token:

```json
{
  "data": "session-uuid-token"
}
```

Kredensial yang salah menghasilkan status `401 Unauthorized`.

### `GET /api/users/current`

Mengambil data user berdasarkan session token.

Header:

```text
Authorization: Bearer <token>
```

Response sukses tidak mengandung password atau token:

```json
{
  "data": {
    "id": 1,
    "name": "aab",
    "email": "aab@localhost",
    "created_at": "timestamp"
  }
}
```

### `DELETE /api/users/logout`

Menghapus session aktif berdasarkan token.

Header:

```text
Authorization: Bearer <token>
```

Response sukses:

```json
{
  "data": "ok"
}
```

Token yang tidak ada, salah format, atau sudah dihapus menghasilkan status
`401 Unauthorized`.

## Setup Project

### Prasyarat

- Bun versi terbaru yang kompatibel.
- MySQL yang sedang berjalan.
- Database aplikasi, misalnya `app_db`, sudah dibuat.

### Instalasi

```bash
bun install
```

Salin `.env.example` menjadi `.env`, lalu sesuaikan nilainya:

```env
PORT=3000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=app_db
MYSQL_USER=root
MYSQL_PASSWORD=
```

Jalankan migration:

```bash
bunx drizzle-kit migrate
```

## Menjalankan Aplikasi

```bash
bun run index.ts
```

Server berjalan secara default di `http://localhost:3000`.

## Menjalankan Test

Jalankan seluruh test:

```bash
bun test
```

Atau melalui script package:

```bash
bun run test
```

Test validasi endpoint dapat berjalan tanpa MySQL. Integration test database
dapat diaktifkan setelah database test dikonfigurasi dan migration dijalankan:

```bash
$env:RUN_INTEGRATION_TESTS="1"
bun test
```

Integration test membersihkan user dan session test agar hasil pengujian dapat
dijalankan berulang secara konsisten.
