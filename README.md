# HAMIM Backend — API Documentation

Backend untuk **HAMIM** (Hafalan Al-Quran Menggunakan Irama Maqdis) — aplikasi gamified hafalan Quran.

- Base URL (development): `http://localhost:3000`
- Semua request/response body: `application/json`
- Semua endpoint (kecuali yang ditandai **Publik**) butuh header:
  ```
  Authorization: Bearer <accessToken>
  ```

---

## Daftar isi

1. [Setup lokal & seed database](#setup-lokal--seed-database)
2. [Struktur project](#struktur-project)
3. [Format response](#format-response)
4. [Alur autentikasi & onboarding](#alur-autentikasi--onboarding)
5. [Health check](#health-check)
6. [Languages](#languages)
7. [Auth](#auth)
8. [Profile](#profile)
9. [Surah](#surah)
10. [Audio](#audio)
11. [Assets](#assets)
12. [Quiz](#quiz)
13. [Lives (nyawa)](#lives-nyawa)
14. [Progress](#progress)
15. [Level & Leaderboard](#level--leaderboard)
16. [Admin API & dashboard web](#admin-api--dashboard-web)
17. [Kode error](#kode-error)
18. [Contoh test cepat (curl)](#contoh-test-cepat-curl)
19. [Deploy (production)](#deploy-production)

---

## Setup lokal & seed database

```bash
npm install
# isi .env (lihat .env.example)

npx prisma migrate dev --name init
npx prisma generate

# urutan wajib — masing-masing butuh data dari langkah sebelumnya
node prisma/seed-languages.js   # 1. bahasa (id, en)
node prisma/seed.js             # 2. 114 surah + ayat + audio
node prisma/seed-dummy.js       # 3. dummy user, asset, progress, quiz, level, dll

npm run dev
```

> **Catatan skema database:** nama tabel & kolom di MySQL (`pengguna`, `surah`, `ayat`, `soal_kuis`, dst) sudah pakai Bahasa Indonesia lewat `@map`/`@@map` di `schema.prisma`. Ini **transparan buat kode dan API** — semua endpoint di bawah tetap pakai nama field Inggris (`email`, `password_hash`, dst) persis seperti sebelumnya, jadi tidak ada breaking change buat tim mobile.

Akun dummy hasil `seed-dummy.js` (password semua: `password123`):
| Email | Keterangan |
|---|---|
| `dummy.raka@hamim.test` | sudah onboarding, level 3, ada progress & quiz attempt |
| `dummy.aisyah@hamim.test` | sudah onboarding, level 1 |
| `dummy.google@hamim.test` | simulasi akun Google, belum onboarding, tidak punya password (login via `/auth/google/native` saja) |

---

## Struktur project

```
hamim-backend-main/
├── src/
│   ├── app.js                 # entry point Express — middleware, routes, start/shutdown server
│   ├── config/                # koneksi database (Prisma) & config passport (Google OAuth)
│   ├── middlewares/           # auth (JWT), admin (role check), error handler global, upload (multer)
│   ├── modules/                # 1 folder per fitur, semua isinya 3 file: route → controller → service
│   │   ├── auth/               # register, login, refresh token, Google OAuth, reset/verifikasi email
│   │   ├── profile/             # onboarding & data profil user
│   │   ├── surah/               # daftar surat & teks Arab (buat mobile client)
│   │   ├── audio/                # audio per surat/ayat + "groups" (audio+arabic+quiz sekaligus)
│   │   ├── assets/                # bundle aset (icon/background/music) & version check
│   │   ├── quiz/                   # bank soal drag_ayat, submit jawaban, riwayat
│   │   ├── lives/                   # sistem nyawa (regen otomatis, nonton iklan, premium)
│   │   ├── progress/                 # tracking hafalan per ayat (listening/reading/quiz) + naik level
│   │   ├── level/                     # 15 tingkatan & leaderboard
│   │   └── admin/                      # API khusus dashboard admin web (lihat bagian Admin di bawah)
│   ├── utils/                  # helper: JWT, response formatter, HttpError, email, timezone, dst.
│   └── docs/openapi.json      # spec OpenAPI 3.0 — CONTOH SEBAGIAN endpoint saja, belum lengkap
│                                 semua endpoint (lihat catatan di bagian Deploy). README ini adalah
│                                 sumber kebenaran yang lebih lengkap & selalu diupdate.
├── prisma/
│   ├── schema.prisma            # skema database (sumber kebenaran struktur tabel)
│   ├── migrations/              # riwayat migration, jangan diedit manual — pakai `prisma migrate`
│   ├── seed*.js                 # script seed (urutan wajib, lihat bagian Setup di atas)
│   └── data/                    # dump JSON teks Al-Quran (Uthmani & Imlaei) dipakai `seed.js`
├── admin-web/                  # dashboard admin — React + Vite + TypeScript, terpisah dari backend
│                                 ini (punya package.json & README sendiri), konsumsi API `/admin/*`
├── tests/smoke.test.js         # smoke test dasar (`npm test`) — bukan test suite lengkap
└── uploads/                    # folder upload user (avatar, dll), di-serve statis di `/uploads/*`
```

**Pola tiap module (`src/modules/<nama>/`):**
- `*.route.js` — daftar endpoint + middleware yang dipasang (auth, rate limit). Baca file ini duluan untuk tahu endpoint apa saja yang tersedia di module tsb.
- `*.controller.js` — terima `req`, validasi input (Zod), panggil service, kirim response lewat `utils/response.js`. Tidak ada business logic di sini.
- `*.service.js` — semua business logic & akses database (Prisma) ada di sini. Kalau mau paham "cara kerja" sebuah fitur, mulai baca dari file ini.

**Kalau mau menambah module baru:** ikuti pola di atas (route → controller → service), lalu daftarkan route-nya di `src/app.js` (lihat bagian `─── Routes ───`).

---

## Format response

Semua endpoint mengembalikan bentuk yang konsisten:

**Sukses:**
```json
{
  "success": true,
  "message": "Pesan singkat",
  "data": { }
}
```

**Gagal:**
```json
{
  "success": false,
  "message": "Pesan error",
  "errors": null
}
```

Khusus error validasi (Zod), `errors` berisi detail per field:
```json
{
  "success": false,
  "message": "Data yang dikirim tidak valid.",
  "errors": [
    { "field": "email", "message": "Format email tidak valid." }
  ]
}
```

---

## Alur autentikasi & onboarding

```
1. Buka app          → GET /languages          (pilih bahasa)
2. Sudah punya akun?
   Ya  → POST /auth/login              (email/password)
       → GET  /auth/google → /auth/google/callback   (Google)
   Belum → POST /auth/register         (email/password)
         → GET  /auth/google → /auth/google/callback   (Google)
3. Cek is_onboarded  → GET /profile/me atau GET /auth/me
   false → tampilkan form onboarding → PATCH /profile/onboarding
   true  → langsung ke home
```

Setiap login/register berhasil mengembalikan `accessToken` (7 hari) dan `refreshToken` (30 hari). Kalau `accessToken` expired, minta yang baru lewat `POST /auth/refresh` — jangan suruh user login ulang.

---

## Health check

### `GET /health`
**Publik.** Cek server hidup.

**Response 200:**
```json
{ "status": "OK", "timestamp": "2026-07-03T10:00:00.000Z" }
```

---

## Languages

### `GET /languages`
**Publik.** List bahasa aktif — dipanggil di layar pertama app, sebelum user tahu mau login atau daftar.

**Response 200:**
```json
{
  "success": true,
  "message": "Daftar bahasa berhasil diambil.",
  "data": [
    { "id": 1, "code": "id", "name": "Bahasa Indonesia" },
    { "id": 2, "code": "en", "name": "English" }
  ]
}
```

---

## Auth

### `POST /auth/register`
**Publik.** Daftar akun baru pakai email/password. Rate limit: 10 request / 15 menit / IP.

**Body:**
```json
{
  "name": "Raka Zeniusa",
  "email": "raka@example.com",
  "phone_number": "081234567890",
  "password": "password123",
  "language_code": "id"
}
```
| Field | Wajib | Keterangan |
|---|---|---|
| `name` | ya | 2–100 karakter, jadi `display_name` di profil |
| `email` | ya | harus unik |
| `phone_number` | ya | harus unik, 8–20 karakter |
| `password` | ya | 8–100 karakter |
| `language_code` | tidak | `"id"` atau `"en"`, dari layar pilih bahasa |

**Response 201:**
```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "raka@example.com",
      "phone_number": "081234567890",
      "is_onboarded": false,
      "created_at": "2026-07-03T10:00:00.000Z",
      "profile": { "display_name": "Raka Zeniusa" }
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Error khas:** `409` — email atau nomor HP sudah terdaftar.

---

### `POST /auth/login`
**Publik.** Login email/password. Rate limit sama seperti register.

**Body:**
```json
{ "email": "raka@example.com", "password": "password123" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": { "id": "uuid", "email": "raka@example.com", "is_onboarded": true },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Error khas:** `401` — email atau password salah (pesan sengaja generik, tidak bilang mana yang salah).

---

### `POST /auth/refresh`
**Publik.** Minta `accessToken` baru pakai `refreshToken`.

**Body:**
```json
{ "refreshToken": "..." }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Token diperbarui.",
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

**Error khas:** `401` — refresh token tidak ada / tidak valid / expired / user sudah dihapus.

---

### `GET /auth/google`
**Publik.** Redirect user ke halaman login Google. Client (mobile) buka ini di in-app browser / WebView.

### `GET /auth/google/callback`
**Publik.** Dipanggil otomatis oleh Google setelah user approve login. Kalau user baru, akun otomatis dibuat (email, `google_id`, `display_name`, `avatar_url` diisi dari data Google). Kalau `email` sudah ada dari akun email/password sebelumnya, `google_id` otomatis di-link ke akun itu.

**Response 200** (mode testing/Postman — nanti diganti deep link ke app mobile):
```json
{ "accessToken": "...", "refreshToken": "..." }
```

> Catatan: user yang daftar via Google **tidak** punya `phone_number` otomatis — harus dilengkapi lewat `PATCH /profile/onboarding`.

---

### `POST /auth/google/native`
**Publik.** Login Google khusus **Flutter/mobile** — tanpa buka browser. Flutter pakai SDK `google_sign_in` (dengan `serverClientId` = Web Client ID di `.env`), dapat `idToken`, lalu kirim ke sini. Backend verifikasi `idToken` langsung ke Google (`google-auth-library`), lalu buat/cari user — logic user-nya sama persis dengan flow `/auth/google/callback` di atas.

**Body:**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIs..." }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login Google berhasil.",
  "data": {
    "user": { "id": "uuid", "email": "raka@example.com", "is_onboarded": false },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Error khas:** `401` — `idToken` tidak valid, sudah expired, atau `audience`-nya tidak cocok dengan `GOOGLE_CLIENT_ID` (biasanya karena Flutter lupa set `serverClientId`).

---

### `POST /auth/forgot-password`
**Publik.** Minta link reset password dikirim ke email. Rate limit sama seperti register/login.

**Body:**
```json
{ "email": "raka@example.com" }
```

**Response 200** (selalu sukses, apa pun kondisinya):
```json
{ "success": true, "message": "Jika email terdaftar, link reset password sudah dikirim." }
```
> Pesan sengaja generik dan **selalu balas sukses** — walau email tidak terdaftar, atau akunnya daftar via Google (tidak punya password) — supaya tidak bisa dipakai untuk menebak email mana yang terdaftar (*user enumeration*). Link asli dikirim lewat email; kalau SMTP belum dikonfigurasi di `.env`, link cukup di-log ke terminal server.

Token reset berlaku **1 jam**.

---

### `POST /auth/reset-password`
**Publik.** Submit token dari email + password baru.

**Body:**
```json
{ "token": "<token dari email/log>", "password": "passwordBaru123" }
```

**Response 200:**
```json
{ "success": true, "message": "Password berhasil direset. Silakan login dengan password baru." }
```

**Error khas:** `400` — token tidak valid, sudah dipakai, atau sudah kadaluarsa (>1 jam).

---

### `GET /auth/verify-email?token=xxxx`
**Publik.** Diklik langsung dari link di email verifikasi (bukan dipanggil dari app/mobile). Menandai `email_verified` jadi `true`.

**Response 200:**
```json
{ "success": true, "message": "Email berhasil diverifikasi. Silakan kembali ke aplikasi." }
```

**Error khas:** `400` — token tidak valid, sudah dipakai (sekali pakai), atau sudah kadaluarsa (>24 jam).

> Catatan: saat ini `email_verified` bersifat informatif saja — belum dipakai untuk membatasi akses ke endpoint lain (belum ada *enforcement*).

---

### `POST /auth/resend-verification`
**Publik.** Kirim ulang link verifikasi (misal karena email pertama tidak sampai atau kadaluarsa). Rate limit sama seperti register/login.

**Body:**
```json
{ "email": "raka@example.com" }
```

**Response 200** (selalu sukses, apa pun kondisinya):
```json
{ "success": true, "message": "Jika email terdaftar dan belum terverifikasi, link verifikasi sudah dikirim." }
```
> Sama seperti `forgot-password`, pesan sengaja generik untuk mencegah *user enumeration* — baik email tidak terdaftar maupun email yang **sudah** terverifikasi tetap dibalas sukses, tapi email baru **hanya** benar-benar dikirim kalau user ada dan belum terverifikasi. Mengirim ulang otomatis menerbitkan token baru (24 jam) dan token lama otomatis tidak berlaku lagi.

---

### `GET /auth/me`
**Butuh login.** Cek token masih valid + ambil data dasar user.

**Response 200:**
```json
{
  "success": true,
  "message": "Data user berhasil diambil.",
  "data": {
    "id": "uuid",
    "email": "raka@example.com",
    "phone_number": "081234567890",
    "is_onboarded": true,
    "email_verified": false,
    "language_id": 1,
    "created_at": "2026-07-03T10:00:00.000Z",
    "profile": {
      "display_name": "Raka Zeniusa",
      "avatar_url": null,
      "learning_start": "juz_akhir",
      "daily_target_minutes": 15
    }
  }
}
```

---

### `DELETE /auth/account`
**Butuh login.** Hapus akun permanen. Semua data turunan (profile, progress, quiz attempt, dll) otomatis ikut terhapus (cascade).

**Body** (wajib **hanya** kalau akun daftar via email/password; akun Google tanpa `password_hash` tidak perlu kirim ini):
```json
{ "password": "password123" }
```

**Response 200:**
```json
{ "success": true, "message": "Akun berhasil dihapus." }
```

**Error khas:** `400` — password wajib diisi (akun email tapi tidak kirim password). `401` — password salah.

---

## Profile

### `PATCH /profile/onboarding`
**Butuh login.** Dipanggil sekali setelah register/login pertama kali untuk melengkapi profil.

**Body:**
```json
{
  "avatar_url": "https://example.com/avatar.jpg",
  "phone_number": "081234567890",
  "learning_start": "juz_akhir",
  "referral_source": "Instagram",
  "motivation_text": "Ingin lebih dekat dengan Al-Quran",
  "daily_target_minutes": 15,
  "audio_repeat_count": 3
}
```
| Field | Wajib | Keterangan |
|---|---|---|
| `avatar_url` | tidak | URL gambar |
| `phone_number` | tidak | **hanya diisi** kalau user daftar via Google dan belum punya nomor tersimpan |
| `learning_start` | ya | `"juz_awal"` atau `"juz_akhir"` |
| `referral_source` | tidak | dari mana tau HAMIM |
| `motivation_text` | tidak | alasan hafalan, maks 500 karakter |
| `daily_target_minutes` | ya | **cuma boleh**: `5`, `10`, `15`, `20`, atau `30` |
| `audio_repeat_count` | ya | integer 1–10 |

Setelah sukses, `is_onboarded` otomatis jadi `true`.

**Response 200:**
```json
{
  "success": true,
  "message": "Profil berhasil dilengkapi.",
  "data": {
    "id": 1,
    "user_id": "uuid",
    "display_name": "Raka Zeniusa",
    "avatar_url": "https://example.com/avatar.jpg",
    "learning_start": "juz_akhir",
    "daily_target_minutes": 15,
    "audio_repeat_count": 3,
    "motivation_text": "Ingin lebih dekat dengan Al-Quran",
    "referral_source": "Instagram",
    "current_level": 1,
    "updated_at": "2026-07-03T10:00:00.000Z"
  }
}
```

**Error khas:** `409` — nomor HP sudah dipakai akun lain. `422` — `daily_target_minutes` bukan salah satu dari 5/10/15/20/30.

---

### `GET /profile/me`
**Butuh login.** Ambil profil lengkap (buat layar profil di app).

**Response 200:**
```json
{
  "success": true,
  "message": "Profil berhasil diambil.",
  "data": {
    "id": "uuid",
    "email": "raka@example.com",
    "phone_number": "081234567890",
    "is_onboarded": true,
    "language": { "code": "id", "name": "Bahasa Indonesia" },
    "profile": {
      "display_name": "Raka Zeniusa",
      "avatar_url": "https://example.com/avatar.jpg",
      "learning_start": "juz_akhir",
      "daily_target_minutes": 15,
      "audio_repeat_count": 3,
      "current_level": 1
    }
  }
}
```

---

## Surah

Endpoint dasar untuk daftar surat & teks Arab mentah (tanpa audio/quiz — untuk itu lihat [Audio](#audio) bagian "groups").

### `GET /surah`
**Butuh login.** Semua 114 surat.

### `GET /surah?juz=5`
**Butuh login.** Cuma surat yang punya ayat di juz tersebut (1–30). Setiap surat yang match juga menyertakan `ayah_range_in_juz` (ayat berapa sampai berapa dari surat itu yang termasuk juz yang diminta) — berguna karena satu surat bisa melintasi beberapa juz (mis. Al-Baqarah).

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid", "number": 1, "name_arabic": "الفاتحة", "name_transliteration": "Al-Fatihah",
      "name_translation_id": "Pembukaan", "juz_start": 1, "total_ayah": 7, "revelation_type": "Makkiyah",
      "ayah_range_in_juz": { "start": 1, "end": 7, "count": 7 }
    }
  ]
}
```
**Error khas:** `422` — `juz` di luar rentang 1–30.

### `GET /surah/:id/ayahs`
**Butuh login.** Semua ayat 1 surat, **teks Arab saja** (tanpa terjemahan/transliterasi/audio) — versi ringan untuk kebutuhan yang cuma perlu teks mentah. `:id` adalah UUID surat (bukan nomor 1–114).

**Response 200:**
```json
{
  "data": {
    "surah": { "id": "uuid", "number": 1, "name_arabic": "الفاتحة", "name_transliteration": "Al-Fatihah", "total_ayah": 7 },
    "ayahs": [{ "id": "uuid", "ayah_number": 1, "text_uthmani": "بِسْمِ اللَّهِ..." }]
  }
}
```
**Error khas:** `404` — surat tidak ditemukan. `422` — `id` bukan UUID valid.

---

## Audio

### `GET /audio/surah/:surahId`
**Butuh login.** Semua audio dalam 1 surat, dikelompokkan per file audio (bukan per ayat) — dipakai untuk pre-load sebelum sesi hafalan dimulai.

**Response 200:**
```json
{
  "success": true,
  "message": "Berhasil mengambil audio surah",
  "data": {
    "surah": { "id": 1, "number": 1, "name_arabic": "الفاتحة", "name_transliteration": "Al-Fatihah", "total_ayah": 7 },
    "total_audio_groups": 3,
    "total_duration_seconds": 95,
    "audio_groups": [
      {
        "audio_id": 12,
        "audio_order": 1,
        "qari_name": "Maqdis",
        "file_url": "https://.../001_01-03.mp3",
        "duration_seconds": 32.5,
        "file_size_bytes": 512000,
        "ayah_start": 1,
        "ayah_end": 3,
        "ayah_count": 3,
        "ayahs": [
          { "id": 1, "ayah_number": 1, "text_uthmani": "...", "translation_id": "...", "transliteration": "..." }
        ]
      }
    ]
  }
}
```

**Error khas:** `404` — surah tidak ditemukan.

---

### `GET /audio/ayah/:ayahId`
**Butuh login.** Audio untuk 1 ayat spesifik. Karena satu file audio bisa mencakup beberapa ayat sekaligus, response berupa array (biasanya isinya 1).

**Response 200:**
```json
{
  "success": true,
  "message": "Berhasil mengambil audio ayat",
  "data": {
    "ayah": { "id": 2, "ayah_number": 2, "juz_number": 1, "text_uthmani": "...", "surah": { "id": 1, "number": 1, "name_transliteration": "Al-Fatihah" } },
    "audio_files": [
      { "audio_id": 12, "audio_order": 1, "ayah_start": 1, "ayah_end": 3, "qari_name": "Maqdis", "file_url": "https://.../001_01-03.mp3", "duration_seconds": 32.5 }
    ]
  }
}
```

**Error khas:** `404` — ayat tidak ditemukan.

---

### `GET /audio/surah/:surahId/groups?language_code=id`
**Butuh login.** Endpoint "gabungan" — dalam **1 kali panggilan** mengembalikan SEMUA kelompok ayat dalam 1 surat, tiap kelompok sudah berisi audio + teks Arab/terjemahan + soal kuis (`drag_ayat`) sekaligus. Dibuat supaya frontend tidak perlu panggil `/audio/surah/:surahId`, `/surah/:id/ayahs`, dan `/quiz/package` terpisah-pisah untuk 1 sesi hafalan — cukup 1 request untuk seluruh surat.

Pembagian "kelompok" **sama persis** dengan pengelompokan audio (berdasarkan `ayah_end_number` di tabel `AudioFile`) — idealnya tiap kelompok berisi 5 soal `drag_ayat`. Response juga menyisipkan status nyawa user (lihat [Lives](#lives-nyawa)), karena kelompok ini nantinya dikerjakan lewat `/quiz/group-attempt` yang memotong nyawa.

**Response 200:**
```json
{
  "data": {
    "surah": { "id": "uuid", "number": 1, "name_transliteration": "Al-Fatihah", "total_ayah": 7 },
    "lives": { "is_premium": false, "current_lives": 1, "max_lives": 1, "unlimited": false, "next_regen_at": null },
    "total_groups": 3,
    "groups": [
      {
        "audio_id": 12, "audio_order": 1, "qari_name": "Maqdis", "file_url": "https://.../001_01-03.mp3",
        "duration_seconds": 32.5, "ayah_start": 1, "ayah_end": 3,
        "ayahs": [{ "id": "uuid", "ayah_number": 1, "text_uthmani": "...", "translation_id": "..." }],
        "questions": [{ "id": "uuid", "type": "drag_ayat", "question_text": "...", "options": [{ "id": "uuid", "option_text": "بِسْمِ" }] }]
      }
    ]
  }
}
```
**Error khas:** `404` — surah tidak ditemukan. `404` — kode bahasa tidak ditemukan (`LANGUAGE_NOT_FOUND`).

### `GET /audio/surah/:surahId/groups/:ayahNumber?language_code=id`
**Butuh login.** Sama seperti di atas tapi cuma balikin **1 kelompok** yang mencakup `ayahNumber` tersebut — dipakai kalau frontend cuma mau load/mulai 1 kelompok tertentu (misal user melanjutkan dari ayat terakhir yang dikerjakan), bukan seluruh surat. `ayahNumber` tidak harus ayat pertama kelompok — ayat mana pun di dalam range kelompok itu (mis. kelompok ayat 1–4, kirim `1`, `2`, `3`, atau `4`) sama-sama mengembalikan kelompok yang sama.

**Response 200:** sama seperti 1 elemen dari `groups` di atas, dibungkus `{ "surah": {...}, "lives": {...}, "group": {...} }`.

**Error khas:** `404` — surah/bahasa tidak ditemukan, atau tidak ada kelompok yang mencakup `ayahNumber` tsb (`GROUP_NOT_FOUND`).

---

## Assets

Sistem aset (icon, background, music) yang di-bundle dan bisa di-download client, dengan version check.

### `GET /assets/bundles`
**Butuh login.** List semua bundle + status sudah di-download atau belum oleh user ini.

**Response 200:**
```json
{
  "data": [
    { "id": 1, "name": "juz_30_audio", "version": 2, "total_size_bytes": 15000000, "description": "...", "is_downloaded": true }
  ]
}
```

### `GET /assets/bundles/:id`
**Butuh login.** Detail 1 bundle + list file di dalamnya.

**Response 200:**
```json
{
  "data": {
    "id": 1, "name": "juz_30_audio", "version": 2,
    "bundle_items": [
      { "id": 1, "asset_type": "audio", "asset_id": 12, "file_url": "https://..." }
    ]
  }
}
```
**Error khas:** `404` — bundle tidak ditemukan.

### `POST /assets/download/confirm`
**Butuh login.** Client panggil ini setelah selesai download bundle, buat catat riwayat + versi app.

**Body:**
```json
{ "bundle_id": 1, "app_version": "1.0.0" }
```

**Response 200:**
```json
{ "data": { "bundle_id": 1, "bundle_name": "juz_30_audio", "downloaded_at": "2026-07-03T10:00:00.000Z" } }
```
**Error khas:** `400` — `bundle_id` tidak dikirim. `404` — bundle tidak ditemukan.

### `GET /assets/icons` · `GET /assets/backgrounds` · `GET /assets/music`
**Butuh login.** Detail aset satu-per-satu (bukan lewat bundle) — dipakai untuk layar semacam "Toko Tema" / "Ganti Ikon" yang butuh preview per item, bukan cuma download massal.

**Response 200** (`/assets/icons`):
```json
{
  "data": [
    { "id": 1, "name": "icon_home", "category": "ui", "file_url": "https://...", "file_size_bytes": 2048, "version": 1 }
  ]
}
```
`/assets/backgrounds` dan `/assets/music` bentuknya sama, field `category` diganti `theme` (background) atau `type` (music).

### `GET /assets/check-updates?versions=juz_30_audio:1,ui_basic:2`
**Butuh login.** Client kirim versi bundle yang sudah dimiliki, server balas mana yang perlu di-update.

**Response 200:**
```json
{
  "data": {
    "has_updates": true,
    "updates": [{ "id": 1, "name": "juz_30_audio", "version": 2, "total_size_bytes": 15000000, "needs_update": true }],
    "up_to_date": ["ui_basic"]
  }
}
```

---

## Quiz

> **Catatan penting untuk yang melanjutkan:** modul ini pernah dirombak besar-besaran. Satu-satunya tipe soal yang aktif sekarang adalah **`drag_ayat`** ("melengkapi ayat" — user menyusun potongan kata jadi urutan yang benar); tipe `multiple_choice` dengan `selected_option_id` sudah **tidak dipakai lagi**. Jangan kaget kalau nemu sisa referensi tipe lama di kode/data — sumber kebenaran soal & jawaban sekarang ada di `quiz.service.js`.

Untuk tiap soal, urutan benar disimpan di `option.order_index` — field ini (dan `is_correct`) **tidak pernah** dikirim ke client saat ambil soal (lihat `sanitizeQuestionForClient`), dan urutan `options` dalam response **diacak** tiap request, supaya jawaban tidak bisa ditebak dari urutan array. Benar/salah baru dihitung di server saat submit.

**Alur pemakaian yang dimaksud (per kelompok ayat, bukan per soal):**
1. Ambil soal 1 kelompok sekaligus lewat `GET /quiz/package` (atau lebih praktis lagi, lewat `GET /audio/surah/:surahId/groups` yang sudah menyertakan soal).
2. User boleh dapat feedback instan per soal lewat `POST /quiz/attempt` — ini **cuma grading, tidak tersimpan ke DB, tidak memotong nyawa**.
3. Setelah kelompok selesai (semua soal dijawab), kirim semuanya sekaligus ke `POST /quiz/group-attempt` — **di sinilah** jawaban benar-benar disimpan, nyawa dipotong 1x, dan `first_session_completed` di-set kalau ini kelompok pertama user.
4. Baru setelah itu, tandai progress ayat lewat `POST /progress` dengan `stage: "quiz"` — endpoint ini sekarang **menolak** kalau belum ada `UserQuizAttempt` untuk ayat tsb (anti-cheat, lihat [Progress](#progress)).

### `GET /quiz/ayah/:ayahId?language_code=id`
**Butuh login.** List soal kuis untuk 1 ayat saja (bukan 1 kelompok), sesuai bahasa (`language_code`, default `"id"`).

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "drag_ayat",
      "question_text": "Susun potongan berikut sesuai urutan ayat.",
      "options": [{ "id": "uuid", "option_text": "بِسْمِ" }, { "id": "uuid", "option_text": "اللَّهِ" }]
    }
  ]
}
```
**Error khas:** `404` — kode bahasa tidak ditemukan.

### `GET /quiz/package?ayah_ids=uuid1,uuid2,uuid3&language_code=id`
**Butuh login.** Semua soal `drag_ayat` untuk **1 kelompok ayat sekaligus** (kelompok yang sama seperti dipakai di stage `listening` — array `ayah_ids` yang sama). Sekaligus menyisipkan status nyawa user, supaya frontend langsung tahu boleh mulai kuis atau tidak sebelum render layar.

> Kalau butuh audio + teks Arab + soal dalam 1x panggilan sekaligus (bukan cuma soal), pakai `GET /audio/surah/:surahId/groups` — lihat [Audio](#audio).

**Body:** tidak ada (query param saja). `ayah_ids` **wajib**.

**Response 200:**
```json
{
  "data": {
    "surah": { "id": "uuid", "number": 1, "name_transliteration": "Al-Fatihah" },
    "lives": { "is_premium": false, "current_lives": 1, "max_lives": 1, "unlimited": false, "next_regen_at": null },
    "ayahs": [
      { "ayah_id": "uuid", "ayah_number": 1, "questions": [{ "id": "uuid", "type": "drag_ayat", "question_text": "...", "options": [{ "id": "uuid", "option_text": "بِسْمِ" }] }] }
    ]
  }
}
```
**Error khas:** `400` — `ayah_ids` tidak dikirim/kosong (`AYAH_IDS_REQUIRED`). `404` — kode bahasa tidak ditemukan.

### `POST /quiz/attempt`
**Butuh login.** Grading **real-time 1 soal saja** (feedback instan benar/salah + urutan yang benar). **Tidak menulis apa pun ke database dan tidak memotong nyawa** — dipakai saat user masih mengerjakan soal satu-per-satu di dalam 1 kelompok. Jawaban baru benar-benar tersimpan lewat `POST /quiz/group-attempt` di akhir kelompok.

**Body:**
```json
{ "question_id": "uuid", "submitted_order": ["opt-uuid-2", "opt-uuid-1", "opt-uuid-3"] }
```
`submitted_order` = array `option.id`, urutan sesuai susunan yang dipilih user (bukan lagi 1 pilihan `selected_option_id` seperti tipe soal lama).

**Response 200:**
```json
{ "data": { "is_correct": false, "correct_order": ["opt-uuid-1", "opt-uuid-2", "opt-uuid-3"] } }
```
**Error khas:** `404` — soal tidak ditemukan (`QUESTION_NOT_FOUND`). `422` — `submitted_order` kosong/bukan array UUID.

### `POST /quiz/group-attempt`
**Butuh login.** Submit **semua jawaban 1 kelompok ayat sekaligus** — ini endpoint yang benar-benar menyimpan hasil ke database. Nyawa dipotong **1x** di sini setelah seluruh kelompok selesai (benar atau salah semua tetap potong 1 nyawa, karena `max_lives` sekarang cuma 1 — lihat [Lives](#lives-nyawa)). Semua operasi (simpan attempt, potong nyawa, cek `first_session_completed`) dibungkus 1 transaksi database — kalau nyawa gagal dipotong (habis), seluruh attempt kelompok itu ikut dibatalkan (tidak ada attempt "yatim").

**Body:**
```json
{
  "idempotency_key": "client-generated-uuid-opsional",
  "answers": [
    { "question_id": "uuid", "submitted_order": ["opt-uuid-2", "opt-uuid-1"], "time_taken_seconds": 4.1 }
  ]
}
```
| Field | Wajib | Keterangan |
|---|---|---|
| `answers` | ya | array jawaban, min. 1 |
| `idempotency_key` | tidak, tapi **sangat disarankan** | key unik per submit kelompok (generate UUID di client). Kalau key yang sama dikirim ulang (double-tap tombol / retry jaringan), server balikin hasil yang **sudah tersimpan** tanpa memotong nyawa lagi kedua kalinya |

**Response 200:**
```json
{
  "data": {
    "total_quiz": 5,
    "correct_count": 4,
    "score_percentage": 80,
    "results": [{ "question_id": "uuid", "attempt_id": "uuid", "is_correct": true, "correct_order": ["opt-uuid-1", "opt-uuid-2"] }],
    "lives": { "is_premium": false, "current_lives": 0, "max_lives": 1, "unlimited": false, "next_regen_at": "2026-07-03T18:00:00.000Z" },
    "first_session_completed": true
  }
}
```
**Error khas:** `403` — nyawa sudah habis (`NO_LIVES_LEFT`, cek ini terjadi **sebelum** kelompok dianggap selesai — user tidak bisa submit kalau nyawa 0). `400` — `answers` kosong. `404` — ada `question_id` yang tidak ditemukan.

### `GET /quiz/history?page=1&limit=20`
**Butuh login.** Riwayat jawaban user, terbaru dulu, dengan pagination (`limit` maksimal 50).

**Response 200:**
```json
{
  "data": {
    "attempts": [{ "id": "uuid", "is_correct": false, "time_taken_seconds": 4.1, "attempted_at": "...", "question": { "id": "uuid", "question_text": "...", "type": "drag_ayat" } }],
    "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
  }
}
```

---

## Lives (nyawa)

Sistem "nyawa" ala game mobile untuk membatasi percobaan kuis. Regen dihitung **lazy** (dari selisih waktu, bukan `cron`) — jadi nyawa tetap "pulih" walau user tidak membuka aplikasi sama sekali; tidak butuh scheduler terpisah.

- User gratis: `max_lives` = 1. Nyawa habis kalau menyelesaikan 1 kelompok kuis (lihat `POST /quiz/group-attempt`). Regen otomatis 1 nyawa tiap **8 jam**, atau instan lewat nonton iklan.
- User premium (`is_premium: true`): nyawa **unlimited** — `current_lives` selalu `null` dan tidak pernah dipotong. Status premium dicek tiap request; kalau `premium_expires_at` sudah lewat, otomatis "diturunkan" jadi free di database.
- Status premium disimpan sederhana (field saja di tabel `UserLives`) — belum ada integrasi payment gateway; premium saat ini cuma bisa di-set manual lewat [Admin API](#admin-api--dashboard-web) (`PATCH /admin/users/:id/premium`).

### `GET /lives`
**Butuh login.** Status nyawa saat ini. Regen dihitung ulang (dan disimpan kalau berubah) setiap kali endpoint ini dipanggil.

**Response 200 (user gratis):**
```json
{ "data": { "is_premium": false, "current_lives": 1, "max_lives": 1, "unlimited": false, "next_regen_at": null } }
```
**Response 200 (user premium):**
```json
{ "data": { "is_premium": true, "premium_expires_at": "2026-09-01T00:00:00.000Z", "current_lives": null, "max_lives": 1, "unlimited": true, "next_regen_at": null } }
```

### `POST /lives/watch-ad`
**Butuh login.** Tambah 1 nyawa instan setelah user selesai nonton iklan (tidak mereset timer regen alami). Rate limit: **5 klaim / 10 menit / user** (bukan per IP — supaya adil untuk banyak user di jaringan/warnet yang sama).

> **Catatan keamanan untuk yang melanjutkan:** rate limit ini cuma mencegah spam cepat. Verifikasi "user beneran sudah nonton iklan sampai selesai" (mis. AdMob Server-Side Verification) **belum diimplementasikan** — client saat ini bisa memanggil endpoint ini tanpa benar-benar menonton iklan. Perlu ditambahkan sebelum rilis produksi.

**Response 200:**
```json
{ "data": { "is_premium": false, "unlimited": false, "current_lives": 1, "max_lives": 1, "added": true } }
```
Kalau nyawa sudah penuh, `added: false` dan `message: "Nyawa sudah penuh"` — tetap `200`, bukan error.

---

## Progress

Sistem tracking hafalan. Setiap ayat punya 3 tahap: `listening` → `reading` → `quiz`.

### `GET /progress`
**Butuh login.** Semua progress user, dikelompokkan per surat.

**Response 200:**
```json
{
  "data": [
    {
      "surah": { "id": 1, "number": 1, "name_transliteration": "Al-Fatihah", "total_ayah": 7 },
      "stages_completed": { "listening": 7, "reading": 5, "quiz": 3 },
      "ayahs": [
        { "ayah_id": 1, "ayah_number": 1, "juz_number": 1, "stage": "listening", "is_completed": true, "completed_at": "...", "attempt_count": 1 }
      ]
    }
  ]
}
```

### `GET /progress/history?page=1&limit=20`
**Butuh login.** Riwayat aktivitas (log game), dengan pagination.

**Response 200:**
```json
{
  "data": {
    "logs": [
      { "id": 1, "activity_type": "listening", "score": null, "duration_seconds": 12.4, "created_at": "...", "ayah_id": 1, "surah": { "id": 1, "number": 1, "name_transliteration": "Al-Fatihah" } }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
  }
}
```

### `POST /progress`
**Butuh login.** Update 1 tahap hafalan selesai. Ini endpoint paling sering dipanggil selama gameplay.

**Body untuk stage `listening`** (satu kelompok audio bisa mencakup beberapa ayat sekaligus, jadi wajib kirim semua `ayah_ids` dalam kelompok itu):
```json
{
  "ayah_id": 1,
  "ayah_ids": [1, 2, 3],
  "surah_id": 1,
  "stage": "listening",
  "duration_seconds": 32.5
}
```

**Body untuk stage `reading`/`quiz`** (per ayat individual):
```json
{
  "ayah_id": 1,
  "surah_id": 1,
  "stage": "quiz",
  "score": 90,
  "duration_seconds": 15.2
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `ayah_id` | ya | ayat (atau ayat pertama dalam kelompok untuk `listening`) |
| `ayah_ids` | wajib untuk `listening` | array semua ayah_id dalam 1 kelompok audio |
| `surah_id` | ya | |
| `stage` | ya | `listening` \| `reading` \| `quiz` |
| `score` | tidak | khusus quiz |
| `duration_seconds` | tidak | |

> **Anti-cheat untuk stage `quiz`:** endpoint ini **menolak** (`403 QUIZ_NOT_ATTEMPTED`) kalau belum ada `UserQuizAttempt` tersimpan untuk `ayah_id` tsb — artinya user wajib benar-benar submit jawaban lewat `POST /quiz/group-attempt` (lihat [Quiz](#quiz)) dulu sebelum progress `quiz` ayat itu bisa ditandai selesai. Sebelumnya client bisa langsung POST `stage: "quiz"` tanpa pernah mengerjakan soal, yang bikin level & leaderboard bisa digame.

Kalau tahap `quiz` bikin **semua ayat dalam 1 surat selesai**, server otomatis cek dan proses kenaikan level (lihat bagian [Level](#level--leaderboard)).

**Response 200:**
```json
{
  "data": {
    "progress": [{ "id": 10, "user_id": "uuid", "ayah_id": 1, "stage": "quiz", "is_completed": true, "attempt_count": 1 }],
    "level_update": { "leveled_up": true, "old_level": 1, "new_level": 2 }
  }
}
```
`level_update` bernilai `null` kalau surat belum selesai semua atau stage-nya bukan `quiz`.

### `GET /progress/surah/:surahId`
**Butuh login.** Progress detail 1 surat, per ayat per tahap — dipakai untuk render peta progress di layar surat.

**Response 200:**
```json
{
  "data": {
    "surah": { "id": 1, "number": 1, "name_transliteration": "Al-Fatihah", "total_ayah": 7, "juz_start": 1 },
    "completion_percentage": 43,
    "completed_ayah": 3,
    "total_ayah": 7,
    "ayahs": [
      {
        "ayah_id": 1, "ayah_number": 1,
        "stages": {
          "listening": { "is_completed": true, "completed_at": "..." },
          "reading":   { "is_completed": true, "completed_at": "..." },
          "quiz":      { "is_completed": false, "completed_at": null }
        },
        "is_fully_completed": false
      }
    ]
  }
}
```
**Error khas:** `404` — surah tidak ditemukan.

---

## Level & Leaderboard

Sistem 15 tingkatan, tiap level butuh 2 juz selesai (semua ayat, semua tahap termasuk quiz).

### `GET /level/me`
**Butuh login.** Level saat ini + progress ke level berikutnya.

**Response 200:**
```json
{
  "data": {
    "current_level": 3,
    "level_name": "Level 3",
    "completed_juz": 5,
    "completed_juz_list": [1, 2, 3, 4, 30],
    "next_level": { "level": 4, "name": "Level 4", "juz_required": 8, "juz_remaining": 3 },
    "is_max_level": false
  }
}
```

### `GET /level/history`
**Butuh login.** Riwayat naik level.

**Response 200:**
```json
{ "data": [{ "id": 1, "level": 2, "achieved_at": "...", "level_name": "Level 2" }] }
```

### `GET /level/info`
**Publik.** Info semua 15 tingkatan (statis, tidak perlu login) — buat layar "roadmap level".

**Response 200:**
```json
{ "data": [{ "level": 1, "name": "Level 1", "juz_required": 2, "juz_range": "Juz 1–2" }] }
```

### `GET /level/leaderboard?limit=50`
**Butuh login.** Ranking user berdasarkan level lalu jumlah juz selesai.

**Response 200:**
```json
{
  "data": [
    { "rank": 1, "user_id": "uuid", "display_name": "Raka", "avatar_url": null, "current_level": 5, "level_name": "Level 5", "total_juz_completed": 10, "updated_at": "..." }
  ]
}
```

---

## Admin API & dashboard web

Backend ini punya satu set endpoint terpisah (`/admin/*`) khusus untuk **dashboard admin web** (`admin-web/` — project React + Vite + TypeScript sendiri, bukan bagian dari app mobile). Dashboard ini dipakai tim internal untuk kelola user, konten Quran/kuis, aset, dan lihat analytics — **bukan** untuk end-user aplikasi.

- Route lengkap ada di `src/modules/admin/admin.route.js` — dikelompokkan jadi 3 fase: **Fase 1** manajemen user (list/detail/premium/reset nyawa/reset progress/soft-delete/restore), **Fase 2** manajemen konten (CRUD surah/ayat/soal kuis, kelola aset), **Fase 3** analytics (overview, leaderboard, aktivitas kuis, pertumbuhan user).
- **Autentikasi terpisah** dari user app: `POST /admin/login` (email/password akun ber-`role: ADMIN`, atau email yang terdaftar di env `ADMIN_EMAILS`) → dapat token JWT khusus admin (umur default 12 jam, lihat `ADMIN_TOKEN_EXPIRES_IN`). Token ini **tidak bisa** dipakai untuk endpoint `/auth/*` atau sebaliknya. Rate limit login admin lebih ketat: 5 percobaan/15 menit (vs 10 untuk user biasa).
- Semua route di bawah `router.use(adminOnly)` (lihat `admin.route.js`) wajib header `Authorization: Bearer <admin-token>` **dan** role `ADMIN` — dicek di `src/middlewares/admin.js`.
- Cara jadi admin: set `role='ADMIN'` langsung di tabel `User`, **atau** cukup tambahkan email ke `ADMIN_EMAILS` di `.env` (pisah koma) tanpa perlu ubah database sama sekali.

**Cara jalankan dashboardnya (development):**
```bash
cd admin-web
npm install
npm run dev
```
Lihat `admin-web/README.md` untuk detail konfigurasi (base URL API, dll). Ada juga `start-admin.bat` di root project untuk shortcut Windows yang menjalankan backend + admin-web sekaligus.

Detail request/response tiap endpoint admin **belum didokumentasikan lengkap di README ini** (business logic-nya ada di `src/modules/admin/admin.service.js`, sudah dikomentari cukup detail per fungsi) — kalau perlu didokumentasikan penuh seperti bagian-bagian di atas, itu kandidat kerjaan lanjutan yang baik.

---

## Kode error

| Status | Kapan terjadi |
|---|---|
| `400` | Input dasar tidak lengkap (bukan dari Zod, dicek manual di controller) |
| `401` | Token tidak ada / tidak valid / expired, atau kredensial login salah |
| `404` | Data tidak ditemukan (surah, ayah, bundle, dll) |
| `409` | Data bentrok — email/nomor HP sudah dipakai (juga otomatis untuk constraint unik Prisma `P2002`) |
| `422` | Validasi Zod gagal — cek array `errors` untuk detail per field |
| `429` | Rate limit terlampaui — maksimal 10 request/15 menit/IP untuk endpoint `auth` yang pakai `authLimiter` (`register`, `login`, `forgot-password`, `reset-password`, `resend-verification`, `google/native`) |
| `500` | Error server/database tak terduga |

---

## Contoh test cepat (curl)

```bash
# 1. Lihat daftar bahasa
curl http://localhost:3000/languages

# 2. Daftar akun
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Raka","email":"raka@example.com","phone_number":"081234567890","password":"password123","language_code":"id"}'

# 3. Login (simpan accessToken dari response)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"raka@example.com","password":"password123"}'

# 4. Lengkapi onboarding (ganti <TOKEN>)
curl -X PATCH http://localhost:3000/profile/onboarding \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"learning_start":"juz_akhir","daily_target_minutes":15,"audio_repeat_count":3}'

# 5. Cek profil
curl http://localhost:3000/profile/me -H "Authorization: Bearer <TOKEN>"

# 6. Login pakai akun dummy (hasil seed-dummy.js)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dummy.raka@hamim.test","password":"password123"}'

# 7. Ambil soal kuis untuk ayat pertama Al-Fatihah (ayah_id sesuaikan hasil seed — UUID, bukan angka)
curl http://localhost:3000/quiz/ayah/<AYAH_UUID> -H "Authorization: Bearer <TOKEN>"

# 8. Lihat daftar ikon aset
curl http://localhost:3000/assets/icons -H "Authorization: Bearer <TOKEN>"

# 9. Verifikasi email — ambil <TOKEN_VERIFIKASI> dari log terminal server
#    (kalau SMTP belum dikonfigurasi) atau dari email asli
curl "http://localhost:3000/auth/verify-email?token=<TOKEN_VERIFIKASI>"

# 10. Kirim ulang link verifikasi (kalau token/link pertama kadaluarsa)
curl -X POST http://localhost:3000/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"raka@example.com"}'

# 11. Lupa password — minta link reset
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"raka@example.com"}'

# 12. Reset password — ambil <TOKEN_RESET> dari log terminal server / email
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN_RESET>","password":"passwordBaru123"}'

# 13. Hapus akun (perlu password kalau daftar via email)
curl -X DELETE http://localhost:3000/auth/account \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}'
```

---

## Deploy (production)

> **Catatan:** `GET /api-docs` (`src/docs/openapi.json`) berisi spec OpenAPI 3.0, tapi **cuma mencakup sebagian endpoint** (health, sebagian auth, lives, quiz/package & group-attempt, progress, sebagian level & assets) sebagai contoh — bukan spec lengkap semua endpoint di README ini. Kalau butuh spec OpenAPI yang benar-benar lengkap (mis. untuk codegen client), itu perlu dilengkapi menyusul; README ini tetap sumber dokumentasi paling lengkap & terkini.

Backend siap dideploy sebagai Docker container (`Dockerfile` sudah disediakan) — langsung jalan di Railway, Render, VPS, atau platform apa pun yang mendukung Docker.

### Variabel env wajib di production

| Variabel | Keterangan |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL MySQL produksi (pakai user + password kuat) |
| `JWT_SECRET` | String acak panjang (min. 32 karakter) |
| `JWT_REFRESH_SECRET` | String acak lain, beda dari `JWT_SECRET` |
| `CORS_ORIGINS` | **Wajib diisi** di production, pisah koma. Contoh: `https://app.hamim.id,https://admin.hamim.id`. Kalau kosong → CORS `*` (semua origin), jangan dipakai di production |
| `BACKEND_URL` | URL publik backend, dipakai untuk link verifikasi email |

Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`) dan SMTP (`SMTP_*`, `RESET_PASSWORD_URL`) diisi sesuai kebutuhan.

### Deploy pakai Docker

```bash
docker build -t hamim-backend .

docker run -d --name hamim \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="mysql://user:pass@host:3306/hamim_db" \
  -e JWT_SECRET="<acak-panjang>" \
  -e JWT_REFRESH_SECRET="<acak-lain>" \
  -e CORS_ORIGINS="https://app.hamim.id" \
  -e BACKEND_URL="https://api.hamim.id" \
  -v hamim_uploads:/app/uploads \
  hamim-backend
```

- Migrasi database dijalankan otomatis saat container start (`prisma migrate deploy`), lalu server menyala.
- Folder `/app/uploads` adalah **volume** — mount biar file avatar/upload tidak hilang saat container restart.
- Health check bawaan: `GET /health` (cek DB juga) — bisa dipakai platform untuk auto-restart.

### Deploy di Railway / Render

1. Push repo ke GitHub, hubungkan ke Railway/Render — keduanya mendeteksi `Dockerfile` otomatis.
2. Buat database MySQL (Railway MySQL addon, atau Aiven/Clever Cloud gratis).
3. Set semua env variabel di atas di dashboard platform.
4. Railway: tab Networking → Generate Domain. Render: Web Service → Create.
5. Setelah deploy, cek `GET {URL}/health` — harus balik `{"status":"OK","database":"OK"}`.

### Catatan produksi

- **CORS**: pastikan `CORS_ORIGINS` berisi domain frontend/admin yang asli.
- **Rate limit** sudah aktif di endpoint auth (login/register/reset: 10 request / 15 menit per IP).
- **Log**: satu baris JSON per request (dengan `req_id`) ke stdout — collect lewat platform log, atau kirim ke ELK/CloudWatch.
- **Backup**: aktifkan backup harian MySQL di penyedia DB — jangan cuma andalkan satu instance