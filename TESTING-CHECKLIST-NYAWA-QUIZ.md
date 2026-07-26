# Checklist Testing — Rename Schema, Nyawa/Premium, Package Kuis

## 0. Persiapan

```powershell
cd D:\backend
npx prisma migrate dev --name init_uuid   # kalau belum
node prisma/seed-languages.js
node prisma/seed.js
node prisma/seed-dummy.js
npm run dev
```

Server jalan di `http://localhost:3000` (sesuaikan PORT di `.env`).

Semua endpoint di bawah (kecuali auth & `/languages`) butuh header:
```
Authorization: Bearer <access_token>
```
Access token didapat dari `POST /auth/login`.

⭐ **Semua timestamp di response API sekarang WIB (UTC+7)**, bukan UTC lagi — format
`2026-07-24T20:30:00.000+07:00`. Coba cek `GET /health` dulu, bandingkan `timestamp`
dengan jam asli kamu sekarang (WIB) — harus sama. Ini berlaku otomatis untuk semua
field tanggal di endpoint manapun (`created_at`, `next_regen_at`, `attempted_at`, dst),
tidak perlu diubah satu-satu di client.

Karena sekarang tidak ada endpoint "list semua surah/ayat", cara ambil `surah_id` /
`ayah_id` / `question_id` asli untuk testing: buka **Prisma Studio**
(`npx prisma studio` di terminal lain) lalu buka tabel `Surah` / `Ayah` / `QuizQuestion`,
copy id UUID-nya. Atau query langsung:
```sql
SELECT id, number, name_transliteration FROM Surah WHERE number IN (1,2,112,114);
SELECT id, ayah_number FROM Ayah WHERE surah_id = '<id surah Al-Fatihah>';
```

---

## 1. Login dummy user

Semua user dummy passwordnya **`password123`**.

| Email | Skenario nyawa |
|---|---|
| dummy.raka@hamim.test | 3/3 nyawa (fresh) |
| dummy.aisyah@hamim.test | 1/3 nyawa, regen ~5 jam lagi |
| dummy.google@hamim.test | 0/3 nyawa, tapi auto-regen ke 1 saat di-GET (sudah lewat 8 jam) |
| dummy.fatimah@hamim.test | **Premium aktif** (nyawa unlimited) |
| dummy.fadhil@hamim.test | Premium **sudah expired** -> auto-downgrade ke free |
| dummy.hasan@hamim.test | 0/3 nyawa, baru habis -> quiz harus ditolak 403 |

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dummy.aisyah@hamim.test","password":"password123"}'
```
✅ Cek: dapat `access_token` + `refresh_token`, status 200.

---

## 2. Modul Auth (`/auth`)
- [ ] `POST /auth/register` — body: `{ name, email, phone_number, password, language_code }` → user baru + belum onboarding
- [ ] `POST /auth/login` — email/password dummy di atas → dapat token
- [ ] `POST /auth/refresh` — body: `{ refresh_token }` → dapat access_token baru
- [ ] `GET /auth/me` (perlu token) → data user login
- [ ] `POST /auth/forgot-password` — body: `{ email }`
- [ ] `GET /auth/verify-email?token=...`
- [ ] ⭐ `DELETE /auth/account` (perlu token, + `password` di body kalau daftar via email) — **SOFT DELETE**, bukan langsung hilang:
  1. Buat/pakai 1 user test khusus (jangan pakai dummy yang dipakai test lain), login dulu untuk dapat token
  2. `DELETE /auth/account` body `{"password":"..."}` → pesan "dijadwalkan dihapus permanen dalam 30 hari"
  3. ✅ Cek di DB: `SELECT deleted_at FROM User WHERE email='...'` → harus terisi timestamp
  4. Coba akses endpoint lain pakai token lama (misal `GET /profile/me`) → harus **403** "Akun sedang dalam proses penghapusan"
  5. `POST /auth/login` lagi dengan akun yang sama → harus sukses **DAN** `account_restored: true` di response, pesan "Akun kamu yang sempat diminta hapus sudah dipulihkan"
  6. ✅ Cek lagi di DB: `deleted_at` sudah balik jadi `NULL`
  7. (Opsional) Untuk test penghapusan permanennya beneran jalan tanpa nunggu 30 hari asli: set manual `deleted_at` ke tanggal 31 hari lalu lewat SQL, restart server / tunggu scheduler jalan (tiap 6 jam) — user itu harus hilang dari tabel `User`. Atau langsung: `node prisma/cleanup-deleted-users.js`

## 3. Modul Language (`/languages`) — publik, tanpa token
- [ ] `GET /languages` → daftar bahasa (id, en)

## 4. Modul Profile (`/profile`)
- [ ] `PATCH /profile/onboarding` — body sesuai `learning_start`, dll (pakai user `dummy.google@hamim.test` karena `is_onboarded: false`)
- [ ] `GET /profile/me` → profil lengkap + `current_level`
- [ ] ⭐ `PATCH /profile` — update profil kapan saja (avatar, nama, target harian, dll), kirim cuma field yang mau diubah:
  ```bash
  curl -X PATCH http://localhost:3000/profile \
    -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
    -d '{"avatar_url":"https://example.com/avatar/baru.png","display_name":"Nama Baru"}'
  ```
  ✅ Cek: cuma field yang dikirim yang berubah, field lain (motivation_text, dll) tetap sama seperti sebelumnya.
- [ ] `PATCH /profile` dengan body kosong `{}` → harus ditolak 400 "Tidak ada field yang dikirim untuk diubah"

## 5. Modul Audio (`/audio`)
- [ ] `GET /audio/surah/:surahId` — pakai `surah_id` Al-Fatihah dari Prisma Studio
- [ ] `GET /audio/ayah/:ayahId`

## 6. Modul Progress (`/progress`)
- [ ] `GET /progress` — pakai token `dummy.raka@hamim.test`
- [ ] `GET /progress/history?page=1&limit=20`
- [ ] `POST /progress` — body: `{ "ayah_id": "<uuid>", "surah_id": "<uuid>", "stage": "listening", "ayah_ids": ["<uuid>"] }`
- [ ] `GET /progress/surah/:surahId`

## 7. Modul Level (`/level`)
- [ ] `GET /level/me`
- [ ] `GET /level/history`
- [ ] `GET /level/info` — publik, tanpa token
- [ ] `GET /level/leaderboard?limit=10` → urutan: Fadhil > Fatimah > Raka > Hasan > Aisyah

## 8. Modul Assets (`/assets`)
- [ ] `GET /assets/bundles`
- [ ] `GET /assets/bundles/:id`
- [ ] `POST /assets/download/confirm` — body: `{ "bundle_id": "<uuid>", "app_version": "1.0.0" }`
- [ ] `GET /assets/check-updates?juz_30_audio=1`
- [ ] `GET /assets/icons`, `GET /assets/backgrounds`, `GET /assets/music`

## 9. ⭐ Modul Lives (`/lives`) — FITUR BARU

### 9a. Cek status nyawa tiap kondisi
- [ ] Login **dummy.raka** → `GET /lives` → harus `{ current_lives: 3, max_lives: 3, unlimited: false, next_regen_at: null }`
- [ ] Login **dummy.aisyah** → `GET /lives` → `current_lives: 1`, `next_regen_at` sekitar 5 jam dari sekarang
- [ ] Login **dummy.google (Budi)** → `GET /lives` → seharusnya **otomatis jadi `current_lives: 1`** (regen dari 9 jam lalu), padahal row awalnya 0. Ini pembuktian regen **lazy** jalan walau app gak pernah dibuka.
- [ ] Login **dummy.fatimah** → `GET /lives` → `{ is_premium: true, unlimited: true, current_lives: null }`
- [ ] Login **dummy.fadhil** → `GET /lives` → `is_premium` harus **false** (auto-downgrade karena `premium_expires_at` sudah lewat kemarin), lanjut hitung nyawa dari `current_lives: 2` seperti user biasa
- [ ] Login **dummy.hasan** → `GET /lives` → `current_lives: 0`

### 9b. Watch ad nambah nyawa
- [ ] Login **dummy.hasan** (0 nyawa) → `POST /lives/watch-ad` → `current_lives` jadi `1`, `added: true`
- [ ] Login **dummy.raka** (sudah 3/3, penuh) → `POST /lives/watch-ad` → `added: false`, pesan "Nyawa sudah penuh", nyawa tetap 3

### 9c. Nyawa berkurang saat salah jawab quiz
(lihat langkah lengkap di section 10 — `POST /quiz/attempt`)

---

## 10. ⭐ Modul Quiz (`/quiz`) — FITUR BARU

### 10a. Package soal per kelompok ayat (satu kali call)
- [ ] Login **dummy.raka**, ambil beberapa `ayah_id` dari Al-Fatihah (Prisma Studio)
  ```bash
  curl "http://localhost:3000/quiz/package?ayah_ids=<uuid1>,<uuid2>&language_code=id" \
    -H "Authorization: Bearer <token>"
  ```
- [ ] ✅ Cek response: satu payload berisi `surah`, `lives` (status nyawa), dan `ayahs[]` — tiap ayah punya `questions[]` lengkap dengan `options[]`. **Tidak perlu call terpisah per ayat.**

### 10b. Ambil soal per 1 ayat (endpoint lama, tetap ada)
- [ ] `GET /quiz/ayah/:ayahId?language_code=id`

### 10c. Submit jawaban SALAH → nyawa berkurang
- [ ] Login **dummy.aisyah** (1 nyawa tersisa). Submit jawaban salah ke salah satu soal:
  ```bash
  curl -X POST http://localhost:3000/quiz/attempt \
    -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
    -d '{"question_id":"<uuid soal>","selected_option_id":"<uuid opsi SALAH>"}'
  ```
- [ ] ✅ Cek: `is_correct: false`, dan `lives.current_lives` turun jadi `0`
- [ ] Submit lagi jawaban apa pun untuk Aisyah (nyawa sudah 0) → harus **403 `NO_LIVES_LEFT`**, pesan "Nyawa kamu sudah habis"

### 10d. Submit jawaban BENAR → nyawa tidak berkurang
- [ ] Login **dummy.raka** (3/3 nyawa), submit jawaban **benar** → `is_correct: true`, `lives: null` (tidak ada perubahan nyawa)

### 10e. User premium tidak pernah kehabisan nyawa
- [ ] Login **dummy.fatimah** (premium aktif), submit jawaban **salah** berkali-kali → tetap boleh terus, tidak pernah 403

### 10f. Riwayat
- [ ] `GET /quiz/history` (pakai dummy.raka, sudah ada 2 attempt dari seed)

---

## Ringkasan hasil yang diharapkan
| Test | Hasil sukses |
|---|---|
| Rename tabel/kolom | Semua endpoint di atas jalan normal, tidak ada error kolom/tabel not found |
| UUID di semua ID | Semua `id` di response berupa string UUID (bukan angka lagi) |
| Nyawa regen lazy | Budi (0 nyawa, 9 jam lalu) otomatis jadi 1 nyawa saat `GET /lives`, tanpa cron |
| Nyawa habis blokir quiz | Aisyah/Hasan (0 nyawa) dapat 403 `NO_LIVES_LEFT` saat `POST /quiz/attempt` |
| Premium unlimited | Fatimah tidak pernah kehabisan nyawa walau salah terus |
| Premium expired auto-downgrade | Fadhil otomatis balik ke free saat dicek |
| Watch ad | Nambah 1 nyawa instan, ditolak halus kalau sudah penuh |
| Package kuis sekali call | `GET /quiz/package` balikin semua soal+jawaban+jenis soal 1 kelompok ayat dalam 1 response |
