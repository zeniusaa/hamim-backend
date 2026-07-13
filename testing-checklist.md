# Checklist Testing API HAMIM Backend

Base URL asumsi: `http://localhost:3000` (sesuaikan kalau `PORT` di `.env` beda).
Jalankan server dulu: `npm run dev`

Urutan di bawah **penting** — beberapa endpoint butuh `accessToken` dari langkah register/login.

---

## 0. Health Check
```bash
curl http://localhost:3000/health
```
Ekspektasi: `{"status":"OK","timestamp":"..."}`

---

## 1. Languages (publik, no auth)
```bash
curl http://localhost:3000/languages
```
⚠️ Kalau kosong `[]` — jalankan dulu `node prisma/seed-languages.js`.

---

## 2. Auth — Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Zeniusa Test",
    "email": "test1@hamim.dev",
    "phone_number": "081234567890",
    "password": "password123",
    "language_code": "id"
  }'
```
Simpan `accessToken` & `refreshToken` dari response — dipakai di langkah berikutnya.
Coba juga kirim ulang dengan email sama → harus reject (email unique).

## 3. Auth — Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@hamim.dev","password":"password123"}'
```
Coba juga dengan password salah → harus 401, bukan 500.

## 4. Auth — Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken dari langkah 2/3>"}'
```

## 5. Auth — Me (protected)
```bash
export TOKEN="<accessToken dari langkah 2/3>"

curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
Coba juga TANPA header Authorization → harus 401 `"Token tidak ditemukan..."`.
Coba juga dengan token asal-asalan → harus 401 `"Token tidak valid."`.

---

## 6. Profile — Onboarding
```bash
curl -X PATCH http://localhost:3000/profile/onboarding \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "avatar_url": "https://example.com/avatar.jpg",
  "phone_number": "081234567890",
  "learning_start": "juz_akhir",
  "referral_source": "Instagram",
  "motivation_text": "Ingin lebih dekat dengan Al-Quran",
  "daily_target_minutes": 15,
  "audio_repeat_count": 3
}'
```
Note: `daily_target_minutes` cuma boleh 5/10/15/20/30 — coba kirim `12` → harus divalidasi gagal.

## 7. Profile — Me
```bash
curl http://localhost:3000/profile/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. Audio — cek hasil seed.js yang baru
Ini yang paling penting buat validasi kerjaan kita sebelumnya.

```bash
# Surah 1 (Al-Fatihah) — harus dapat audio ASLI Maqdis (bukan everyayah.com placeholder)
curl http://localhost:3000/audio/surah/1 \
  -H "Authorization: Bearer $TOKEN"

# Surah 2 (Al-Baqarah) — belum ada di tbl_surat.sql, harus fallback placeholder everyayah.com
curl http://localhost:3000/audio/surah/2 \
  -H "Authorization: Bearer $TOKEN"

# 1 ayat spesifik
curl http://localhost:3000/audio/ayah/1 \
  -H "Authorization: Bearer $TOKEN"
```
✅ Cek: `file_url` surah 1 mengarah ke `api.maqdisacademy.com`, surah 2 ke `everyayah.com`.

---

## 9. Assets
```bash
curl http://localhost:3000/assets/bundles -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/assets/icons -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/assets/backgrounds -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/assets/music -H "Authorization: Bearer $TOKEN"
```
⚠️ Kemungkinan besar kosong kalau belum ada seed khusus asset bundle — cek dulu apa `seed-dummy.js` isi ini.

---

## 10. Progress
```bash
# Lihat progress (baru register — harus kosong / semua belum selesai)
curl http://localhost:3000/progress -H "Authorization: Bearer $TOKEN"

# Update progress — stage listening butuh ayah_ids (array)
curl -X POST http://localhost:3000/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ayah_id": 1,
    "ayah_ids": [1],
    "surah_id": 1,
    "stage": "listening",
    "duration_seconds": 12.5
  }'

# Cek lagi — harus berubah
curl http://localhost:3000/progress -H "Authorization: Bearer $TOKEN"

curl "http://localhost:3000/progress/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/progress/surah/1 -H "Authorization: Bearer $TOKEN"
```

---

## 11. Level
```bash
curl http://localhost:3000/level/info   # publik, no auth
curl http://localhost:3000/level/me -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/level/history -H "Authorization: Bearer $TOKEN"
curl "http://localhost:3000/level/leaderboard?limit=10" -H "Authorization: Bearer $TOKEN"
```

---

## 12. Quiz
```bash
curl http://localhost:3000/quiz/ayah/1 -H "Authorization: Bearer $TOKEN"
```
⚠️ Kemungkinan kosong — `seed.js` yang baru **belum** generate `QuizQuestion`. Kalau memang belum ada data soal, ini bukan bug, cuma belum ada datanya.

Kalau ada soal, ambil salah satu `id` question & option, lalu:
```bash
curl -X POST http://localhost:3000/quiz/attempt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question_id": 1, "selected_option_id": 1, "time_taken_seconds": 4.2}'

curl http://localhost:3000/quiz/history -H "Authorization: Bearer $TOKEN"
```

---

## 13. Error cases umum yang wajib dicoba
- Endpoint yang butuh auth, dipanggil tanpa token → harus **401**, bukan 500.
- ID yang tidak ada di DB (mis. `/audio/surah/9999`) → harus response rapi, bukan crash server.
- Route yang tidak ada (mis. `/foo/bar`) → harus **404** `"Endpoint tidak ditemukan."`

---

## Yang perlu dilaporkan balik ke aku
1. Apapun yang **500** (internal server error) — paste stack trace-nya dari terminal server.
2. Response yang isinya beda dari ekspektasi di atas (mis. field hilang, format aneh).
3. Endpoint mana yang datanya kosong padahal seharusnya ada (biasanya artinya perlu seed tambahan).
