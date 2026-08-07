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
2. [Format response](#format-response)
3. [Alur autentikasi & onboarding](#alur-autentikasi--onboarding)
4. [Health check](#health-check)
5. [Languages](#languages)
6. [Auth](#auth)
7. [Profile](#profile)
8. [Audio](#audio)
9. [Assets](#assets)
10. [Quiz](#quiz)
11. [Progress](#progress)
12. [Level & Leaderboard](#level--leaderboard)
13. [Kode error](#kode-error)
14. [Contoh test cepat (curl)](#contoh-test-cepat-curl)

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

Bank soal per ayat, dipakai di tahap `quiz` (lihat [Progress](#progress)). `is_correct` sengaja **tidak pernah** dikirim ke client saat ambil soal — biar tidak bisa dicontek dari response; benar/salahnya dihitung di server saat submit jawaban.

### `GET /quiz/ayah/:ayahId?language_code=id`
**Butuh login.** List soal kuis untuk 1 ayat, sesuai bahasa (`language_code`, default `"id"`).

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question_text": "Ayat pertama Al-Fatihah dimulai dengan lafaz apa?",
      "options": [
        { "id": 1, "option_text": "Bismillahirrahmanirrahim", "order_index": 0 },
        { "id": 2, "option_text": "Alhamdulillah", "order_index": 1 }
      ]
    }
  ]
}
```
**Error khas:** `404` — kode bahasa tidak ditemukan.

### `POST /quiz/attempt`
**Butuh login.** Submit jawaban 1 soal. Server yang menentukan benar/salah, bukan client.

**Body:**
```json
{ "question_id": 1, "selected_option_id": 2, "time_taken_seconds": 4.1 }
```

**Response 200:**
```json
{
  "data": { "attempt_id": 15, "is_correct": false, "correct_option_id": 1 }
}
```
**Error khas:** `404` — soal tidak ditemukan. `400` — `selected_option_id` bukan opsi dari soal tersebut.

### `GET /quiz/history`
**Butuh login.** 50 riwayat jawaban terakhir user, terbaru dulu.

**Response 200:**
```json
{
  "data": [
    { "id": 15, "is_correct": false, "time_taken_seconds": 4.1, "attempted_at": "...", "question": { "id": 1, "question_text": "...", "type": "multiple_choice" } }
  ]
}
```

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

# 7. Ambil soal kuis untuk ayat pertama Al-Fatihah (ayah_id sesuaikan hasil seed)
curl http://localhost:3000/quiz/ayah/1 -H "Authorization: Bearer <TOKEN>"

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