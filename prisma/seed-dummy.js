// ============================================================
//  HAMIM — Seed Dummy Data
//  Jalankan SETELAH seed-languages.js dan seed.js
//    node prisma/seed-languages.js
//    node prisma/seed.js
//    node prisma/seed-dummy.js
//
//  Mengisi data contoh untuk: users, user_profiles, assets_*,
//  asset_bundles, user_progress, quiz_questions/options,
//  user_quiz_attempts, user_levels, leaderboard_snapshots,
//  user_activity_logs
//
//  Leaderboard: 5 user (Fadhil, Fatimah, Raka, Hasan, Aisyah) diberi
//  leaderboard_snapshot langsung supaya GET /level/leaderboard punya
//  data buat ditest, dengan urutan level & juz_completed yang beda-beda.
//  Budi (Google, belum onboarding) sengaja TIDAK diberi snapshot —
//  buat test kasus "user belum pernah main sama sekali".
//
//  ⚠️ CATATAN PENTING soal leaderboard_snapshot:
//  Snapshot di sini di-INSERT LANGSUNG (bukan hasil hitungan dari
//  user_progress asli). Kalau nanti endpoint GET /level/me dipanggil
//  untuk salah satu user dummy ini, level.service.js akan HITUNG ULANG
//  dari user_progress yang sebenarnya dan overwrite snapshot-nya —
//  jadi angkanya bisa balik ke level 1 / 0 juz kalau user itu belum
//  benar-benar punya progress ayat yang lengkap. Untuk test GET
//  /level/leaderboard doang, ini tidak masalah karena leaderboard baca
//  langsung dari tabel snapshot.
// ============================================================
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  // ─── 1. Ambil data master yang sudah ada (dari seed.js & seed-languages.js) ───
  const bahasaId = await prisma.language.findUnique({ where: { code: 'id' } })
  const bahasaEn = await prisma.language.findUnique({ where: { code: 'en' } })
  if (!bahasaId || !bahasaEn) {
    throw new Error('Data bahasa belum ada. Jalankan dulu: node prisma/seed-languages.js')
  }

  const alFatihah = await prisma.surah.findUnique({ where: { number: 1 } })
  const alBaqarah = await prisma.surah.findUnique({ where: { number: 2 } })
  const anNas = await prisma.surah.findUnique({ where: { number: 114 } })
  const alIkhlas = await prisma.surah.findUnique({ where: { number: 112 } })
  if (!alFatihah || !alBaqarah || !anNas || !alIkhlas) {
    throw new Error('Data surah belum ada. Jalankan dulu: node prisma/seed.js')
  }

  const getAyah = (surah, ayahNumber) =>
    prisma.ayah.findUnique({
      where: { surah_id_ayah_number: { surah_id: surah.id, ayah_number: ayahNumber } },
    })

  const ayahFatihah1 = await getAyah(alFatihah, 1)
  const ayahFatihah2 = await getAyah(alFatihah, 2)
  const ayahBaqarah1 = await getAyah(alBaqarah, 1)
  const ayahBaqarah2 = await getAyah(alBaqarah, 2)
  const ayahAnNas1 = await getAyah(anNas, 1)
  const ayahIkhlas1 = await getAyah(alIkhlas, 1)

  if (!ayahFatihah1 || !ayahFatihah2 || !ayahBaqarah1 || !ayahBaqarah2 || !ayahAnNas1 || !ayahIkhlas1) {
    throw new Error('Data ayat belum lengkap. Pastikan node prisma/seed.js sudah selesai jalan.')
  }

  // ─── 2. Users + Profile ─────────────────────────────────────
  const password_hash = await bcrypt.hash('password123', 10)

  const user1 = await prisma.user.upsert({
    where: { email: 'dummy.raka@hamim.test' },
    update: {},
    create: {
      email: 'dummy.raka@hamim.test',
      password_hash,
      phone_number: '081200000001',
      phone_verified: true,
      is_onboarded: true,
      language_id: bahasaId.id,
      profile: {
        create: {
          display_name: 'Raka (Dummy)',
          avatar_url: 'https://example.com/avatar/raka.png',
          learning_start: 'juz_akhir',
          daily_target_minutes: 20,
          audio_repeat_count: 3,
          motivation_text: 'Ingin khatam sebelum Ramadan',
          referral_source: 'Instagram',
          current_level: 3,
        },
      },
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'dummy.aisyah@hamim.test' },
    update: {},
    create: {
      email: 'dummy.aisyah@hamim.test',
      password_hash,
      phone_number: '081200000002',
      phone_verified: true,
      is_onboarded: true,
      language_id: bahasaId.id,
      profile: {
        create: {
          display_name: 'Aisyah (Dummy)',
          avatar_url: 'https://example.com/avatar/aisyah.png',
          learning_start: 'juz_awal',
          daily_target_minutes: 15,
          audio_repeat_count: 5,
          current_level: 1,
        },
      },
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'dummy.google@hamim.test' },
    update: {},
    create: {
      email: 'dummy.google@hamim.test',
      google_id: 'google-dummy-id-001',
      is_onboarded: false, // simulasi user baru login Google, belum isi onboarding
      language_id: bahasaEn.id,
      profile: {
        create: { display_name: 'Budi (Dummy Google)', current_level: 1 },
      },
    },
  })

  const user4 = await prisma.user.upsert({
    where: { email: 'dummy.fatimah@hamim.test' },
    update: {},
    create: {
      email: 'dummy.fatimah@hamim.test',
      password_hash,
      phone_number: '081200000004',
      phone_verified: true,
      is_onboarded: true,
      language_id: bahasaId.id,
      profile: {
        create: {
          display_name: 'Fatimah (Dummy)',
          avatar_url: 'https://example.com/avatar/fatimah.png',
          learning_start: 'juz_akhir',
          daily_target_minutes: 30,
          audio_repeat_count: 3,
          motivation_text: 'Hafalan rutin tiap habis Subuh',
          referral_source: 'Teman',
          current_level: 6,
        },
      },
    },
  })

  const user5 = await prisma.user.upsert({
    where: { email: 'dummy.fadhil@hamim.test' },
    update: {},
    create: {
      email: 'dummy.fadhil@hamim.test',
      password_hash,
      phone_number: '081200000005',
      phone_verified: true,
      is_onboarded: true,
      language_id: bahasaId.id,
      profile: {
        create: {
          display_name: 'Fadhil (Dummy)',
          avatar_url: 'https://example.com/avatar/fadhil.png',
          learning_start: 'juz_akhir',
          daily_target_minutes: 30,
          audio_repeat_count: 2,
          motivation_text: 'Target khatam Juz 30 bulan ini',
          referral_source: 'TikTok',
          current_level: 8,
        },
      },
    },
  })

  const user6 = await prisma.user.upsert({
    where: { email: 'dummy.hasan@hamim.test' },
    update: {},
    create: {
      email: 'dummy.hasan@hamim.test',
      password_hash,
      phone_number: '081200000006',
      phone_verified: true,
      is_onboarded: true,
      language_id: bahasaEn.id,
      profile: {
        create: {
          display_name: 'Hasan (Dummy)',
          avatar_url: 'https://example.com/avatar/hasan.png',
          learning_start: 'juz_awal',
          daily_target_minutes: 15,
          audio_repeat_count: 4,
          current_level: 2,
        },
      },
    },
  })

  // ─── 3. Asset detail (icon / background / music) ───────────
  const icon1 = await prisma.assetIcon.upsert({
    where: { name: 'icon_home' },
    update: {},
    create: { name: 'icon_home', category: 'ui', file_url: 'https://cdn.hamim.app/icons/home.svg', file_size_bytes: 2048, version: 1 },
  })
  const icon2 = await prisma.assetIcon.upsert({
    where: { name: 'badge_juz_30' },
    update: {},
    create: { name: 'badge_juz_30', category: 'badge', file_url: 'https://cdn.hamim.app/icons/badge_juz_30.svg', file_size_bytes: 4096, version: 1 },
  })

  const bg1 = await prisma.assetBackground.upsert({
    where: { name: 'bg_masjid_pagi' },
    update: {},
    create: { name: 'bg_masjid_pagi', theme: 'default', file_url: 'https://cdn.hamim.app/bg/masjid_pagi.jpg', file_size_bytes: 512000, version: 1 },
  })

  const music1 = await prisma.assetMusic.upsert({
    where: { name: 'bgm_tenang' },
    update: {},
    create: { name: 'bgm_tenang', type: 'bgm', file_url: 'https://cdn.hamim.app/music/tenang.mp3', duration_seconds: 180, file_size_bytes: 2500000, version: 1 },
  })
  const music2 = await prisma.assetMusic.upsert({
    where: { name: 'sfx_benar' },
    update: {},
    create: { name: 'sfx_benar', type: 'sfx', file_url: 'https://cdn.hamim.app/music/sfx_benar.mp3', duration_seconds: 1.5, file_size_bytes: 30000, version: 1 },
  })

  // ─── 4. Asset Bundle + Bundle Item ──────────────────────────
  const bundleUiDasar = await prisma.assetBundle.upsert({
    where: { name: 'ui_basic' },
    update: {},
    create: {
      name: 'ui_basic',
      version: 1,
      total_size_bytes: icon1.file_size_bytes + bg1.file_size_bytes,
      description: 'Paket aset dasar: ikon UI dan background utama',
      bundle_items: {
        create: [
          { asset_type: 'icon', asset_id: icon1.id, file_url: icon1.file_url },
          { asset_type: 'background', asset_id: bg1.id, file_url: bg1.file_url },
        ],
      },
    },
  })

  const bundleAudioJuz30 = await prisma.assetBundle.upsert({
    where: { name: 'juz_30_audio' },
    update: {},
    create: {
      name: 'juz_30_audio',
      version: 1,
      total_size_bytes: music1.file_size_bytes,
      description: 'Paket audio & musik latar untuk Juz 30',
      bundle_items: {
        create: [
          { asset_type: 'music', asset_id: music1.id, file_url: music1.file_url },
          { asset_type: 'music', asset_id: music2.id, file_url: music2.file_url },
        ],
      },
    },
  })

  // ─── 5. User Downloaded Asset ───────────────────────────────
  await prisma.userDownloadedAsset.upsert({
    where: { user_id_bundle_id: { user_id: user1.id, bundle_id: bundleUiDasar.id } },
    update: {},
    create: { user_id: user1.id, bundle_id: bundleUiDasar.id, app_version: '1.0.0' },
  })

  // ─── 6. User Progress ────────────────────────────────────────
  const progressData = [
    { user_id: user1.id, ayah_id: ayahFatihah1.id, stage: 'listening', is_completed: true, completed_at: new Date(), attempt_count: 2 },
    { user_id: user1.id, ayah_id: ayahFatihah1.id, stage: 'reading', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user1.id, ayah_id: ayahFatihah1.id, stage: 'quiz', is_completed: false, attempt_count: 1 },
    { user_id: user1.id, ayah_id: ayahFatihah2.id, stage: 'listening', is_completed: false, attempt_count: 0 },
    { user_id: user2.id, ayah_id: ayahBaqarah1.id, stage: 'listening', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user4.id, ayah_id: ayahAnNas1.id, stage: 'listening', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user4.id, ayah_id: ayahAnNas1.id, stage: 'reading', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user5.id, ayah_id: ayahIkhlas1.id, stage: 'listening', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user5.id, ayah_id: ayahIkhlas1.id, stage: 'reading', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user5.id, ayah_id: ayahIkhlas1.id, stage: 'quiz', is_completed: true, completed_at: new Date(), attempt_count: 1 },
    { user_id: user6.id, ayah_id: ayahBaqarah2.id, stage: 'listening', is_completed: false, attempt_count: 1 },
  ]
  for (const p of progressData) {
    await prisma.userProgress.upsert({
      where: { user_id_ayah_id_stage: { user_id: p.user_id, ayah_id: p.ayah_id, stage: p.stage } },
      update: {},
      create: p,
    })
  }

  // ─── 7. Quiz Question + Option (Bahasa Indonesia & English) ─
  // Sekarang cuma 1 tipe kuis: drag_ayat (melengkapi ayat / drag and drop
  // arabic) — susun potongan kata ayat (diambil dari text_uthmani) sesuai
  // urutan yang benar. Tipe multiple_choice sudah dihapus dari QuizType.
  // SETIAP ayat dibuat 2 soal: bahasa Indonesia + English. Idempotent —
  // kombinasi ayah + tipe + bahasa yang sudah ada (termasuk yang dibuat
  // seed-quiz-package.js / seed-quiz2.js) di-skip, tidak dibuat ulang.
  const wordsOf = (ayah) => ayah.text_uthmani.trim().split(/\s+/)

  // Buat soal kalau belum ada; kalau sudah ada, kembalikan yang lama.
  // optionChunks opsional: potongan yang lebih besar (2 kata per opsi);
  // kalau tidak dikirim, otomatis 1 kata per opsi dari text_uthmani.
  const createQuizQuestionIfMissing = async ({ ayah, questionText, languageId, optionChunks }) => {
    const existing = await prisma.quizQuestion.findFirst({
      where: { ayah_id: ayah.id, type: 'drag_ayat', language_id: languageId },
      // Wajib: soal yang dikembalikan (baik yang baru dibuat maupun yang
      // sudah ada) dipakai lagi oleh bagian User Quiz Attempt lewat
      // q.options (correctOrder/shuffledOrder).
      include: { options: true },
    })
    if (existing) return existing

    const optionRows = optionChunks
      ? optionChunks.map((text, i) => ({ option_text: text, is_correct: true, order_index: i }))
      : wordsOf(ayah).map((w, i) => ({ option_text: w, is_correct: true, order_index: i }))

    return prisma.quizQuestion.create({
      data: {
        ayah_id: ayah.id,
        type: 'drag_ayat',
        question_text: questionText,
        language_id: languageId,
        options: { create: optionRows },
      },
      include: { options: true },
    })
  }

  // Semua 5 ayat dummy dibuat 2 soal: ID + EN (10 soal total).
  // q1/q4/q5 dipakai lagi di bagian User Quiz Attempt di bawah.
  const [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10] = await Promise.all([
    // Al-Fatihah 1 — ID & EN
    createQuizQuestionIfMissing({ ayah: ayahFatihah1, languageId: bahasaId.id, questionText: 'Susun kembali potongan ayat pertama Al-Fatihah sesuai urutan yang benar.' }),
    createQuizQuestionIfMissing({ ayah: ayahFatihah1, languageId: bahasaEn.id, questionText: 'Rearrange the pieces of the first ayah of Al-Fatihah into the correct order.' }),
    // Al-Fatihah 2 — ID & EN (potongan lebih besar: 2 kata per opsi)
    createQuizQuestionIfMissing({
      ayah: ayahFatihah2, languageId: bahasaId.id, questionText: 'Susun kembali potongan ayat kedua Al-Fatihah sesuai urutan.',
      optionChunks: ['الْحَمْدُ لِلَّهِ', 'رَبِّ الْعَالَمِينَ'],
    }),
    // Al-Baqarah 1 — ID & EN (ayat pendek: Alif Lam Mim)
    createQuizQuestionIfMissing({ ayah: ayahBaqarah1, languageId: bahasaId.id, questionText: 'Susun kembali potongan ayat pertama Al-Baqarah sesuai urutan yang benar.' }),
    // An-Nas 1 — ID & EN
    createQuizQuestionIfMissing({ ayah: ayahAnNas1, languageId: bahasaId.id, questionText: 'Susun kembali potongan ayat pertama An-Nas sesuai urutan yang benar.' }),
    createQuizQuestionIfMissing({ ayah: ayahAnNas1, languageId: bahasaEn.id, questionText: 'Rearrange the pieces of the first ayah of An-Nas into the correct order.' }),
    // Al-Ikhlas 1 — ID & EN (potongan lebih besar: 2 kata per opsi)
    createQuizQuestionIfMissing({
      ayah: ayahIkhlas1, languageId: bahasaId.id, questionText: 'Susun kembali potongan Surah Al-Ikhlas ayat 1 sesuai urutan.',
      optionChunks: ['قُلْ هُوَ اللَّهُ', 'أَحَدٌ'],
    }),
    // English untuk ayat yang tadinya cuma ID (Al-Fatihah 2, Al-Baqarah 1, Al-Ikhlas 1)
    createQuizQuestionIfMissing({
      ayah: ayahFatihah2, languageId: bahasaEn.id, questionText: 'Rearrange the pieces of the second ayah of Al-Fatihah into the correct order.',
      optionChunks: ['الْحَمْدُ لِلَّهِ', 'رَبِّ الْعَالَمِينَ'],
    }),
    createQuizQuestionIfMissing({ ayah: ayahBaqarah1, languageId: bahasaEn.id, questionText: 'Rearrange the pieces of the first ayah of Al-Baqarah into the correct order.' }),
    createQuizQuestionIfMissing({
      ayah: ayahIkhlas1, languageId: bahasaEn.id, questionText: 'Rearrange the pieces of Surah Al-Ikhlas ayah 1 into the correct order.',
      optionChunks: ['قُلْ هُوَ اللَّهُ', 'أَحَدٌ'],
    }),
  ])

  // ─── 8. User Quiz Attempt ────────────────────────────────────
  // submitted_order = urutan option_id yang "disusun" user. Dibandingkan
  // dengan urutan benar (option.order_index) untuk menentukan is_correct.
  const correctOrder = (q) => [...q.options].sort((a, b) => a.order_index - b.order_index).map((o) => o.id)
  const shuffledOrder = (q) => {
    const ids = correctOrder(q)
    // Tukar 2 elemen pertama biar jelas urutannya SALAH (kalau cuma 1 kata, biarkan saja).
    if (ids.length > 1) [ids[0], ids[1]] = [ids[1], ids[0]]
    return ids
  }

  await prisma.userQuizAttempt.create({
    data: { user_id: user1.id, question_id: q1.id, submitted_order: shuffledOrder(q1), is_correct: false, time_taken_seconds: 8.2 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user1.id, question_id: q1.id, submitted_order: correctOrder(q1), is_correct: true, time_taken_seconds: 4.1 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user2.id, question_id: q4.id, submitted_order: correctOrder(q4), is_correct: true, time_taken_seconds: 6.0 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user5.id, question_id: q5.id, submitted_order: correctOrder(q5), is_correct: true, time_taken_seconds: 3.4 },
  })

  // ─── 9. User Level (riwayat naik level) ─────────────────────
  await prisma.userLevel.createMany({
    data: [
      { user_id: user1.id, level: 1, achieved_at: new Date('2026-06-01') },
      { user_id: user1.id, level: 2, achieved_at: new Date('2026-06-15') },
      { user_id: user1.id, level: 3, achieved_at: new Date('2026-07-01') },
      { user_id: user2.id, level: 1, achieved_at: new Date('2026-07-05') },
      { user_id: user4.id, level: 1, achieved_at: new Date('2026-05-01') },
      { user_id: user4.id, level: 3, achieved_at: new Date('2026-05-20') },
      { user_id: user4.id, level: 6, achieved_at: new Date('2026-06-25') },
      { user_id: user5.id, level: 1, achieved_at: new Date('2026-04-10') },
      { user_id: user5.id, level: 4, achieved_at: new Date('2026-05-15') },
      { user_id: user5.id, level: 8, achieved_at: new Date('2026-07-01') },
      { user_id: user6.id, level: 1, achieved_at: new Date('2026-06-20') },
      { user_id: user6.id, level: 2, achieved_at: new Date('2026-07-08') },
    ],
  })

  // ─── 10. Leaderboard Snapshot (5 user, rank beda-beda) ──────
  // Urutan tampil di GET /level/leaderboard: current_level desc, lalu total_juz_completed desc.
  // Rank 1: Fadhil (level 8) > Rank 2: Fatimah (level 6) > Rank 3: Raka (level 3)
  // > Rank 4: Hasan (level 2) > Rank 5: Aisyah (level 1)
  const leaderboardData = [
    { user_id: user5.id, total_juz_completed: 16, current_level: 8 }, // Fadhil
    { user_id: user4.id, total_juz_completed: 12, current_level: 6 }, // Fatimah
    { user_id: user1.id, total_juz_completed: 5,  current_level: 3 }, // Raka
    { user_id: user6.id, total_juz_completed: 3,  current_level: 2 }, // Hasan
    { user_id: user2.id, total_juz_completed: 0,  current_level: 1 }, // Aisyah
  ]
  for (const lb of leaderboardData) {
    await prisma.leaderboardSnapshot.upsert({
      where: { user_id: lb.user_id },
      update: { total_juz_completed: lb.total_juz_completed, current_level: lb.current_level },
      create: lb,
    })
  }
  // Budi (user3) sengaja tidak diberi snapshot — edge case "belum pernah main".

  // ─── 11. User Activity Log ───────────────────────────────────
  await prisma.userActivityLog.createMany({
    data: [
      { user_id: user1.id, surah_id: alFatihah.id, ayah_id: ayahFatihah1.id, activity_type: 'listening_completed', score: null, duration_seconds: 12.5 },
      { user_id: user1.id, surah_id: alFatihah.id, ayah_id: ayahFatihah1.id, activity_type: 'quiz_completed', score: 50, duration_seconds: 12.3 },
      { user_id: user2.id, surah_id: alBaqarah.id, ayah_id: ayahBaqarah1.id, activity_type: 'listening_completed', score: null, duration_seconds: 9.8 },
      { user_id: user4.id, surah_id: anNas.id, ayah_id: ayahAnNas1.id, activity_type: 'listening_completed', score: null, duration_seconds: 8.1 },
      { user_id: user4.id, surah_id: anNas.id, ayah_id: ayahAnNas1.id, activity_type: 'reading_completed', score: null, duration_seconds: 15.0 },
      { user_id: user5.id, surah_id: alIkhlas.id, ayah_id: ayahIkhlas1.id, activity_type: 'quiz_completed', score: 100, duration_seconds: 6.5 },
      { user_id: user6.id, surah_id: alBaqarah.id, ayah_id: ayahBaqarah2.id, activity_type: 'listening_completed', score: null, duration_seconds: 11.2 },
    ],
  })

  // ─── 12. User Lives (nyawa + premium) — beda kondisi tiap user biar semua skenario bisa ditest ───
  const HOUR = 60 * 60 * 1000
  const now = Date.now()

  const livesData = [
    // Raka: fresh, nyawa penuh (kondisi default user baru). Nyawa cuma 1 sekarang.
    { user_id: user1.id, current_lives: 1, max_lives: 1, last_life_lost_at: null, is_premium: false, premium_expires_at: null },
    // Aisyah: nyawa habis, baru hilang 3 jam lalu (habis setelah menyelesaikan 1 kelompok
    //   ayat kuis) -> regen berikutnya masih ~5 jam lagi.
    //   Test: GET /lives harus balikin current_lives=0, next_regen_at ~5 jam dari sekarang.
    { user_id: user2.id, current_lives: 0, max_lives: 1, last_life_lost_at: new Date(now - 3 * HOUR), is_premium: false, premium_expires_at: null },
    // Budi: nyawa habis, tapi sudah lewat 9 jam sejak kehilangan nyawa terakhir -> saat GET /lives
    //   dipanggil, harus auto-regen jadi 1 nyawa (lazy calc, walau app tidak pernah dibuka).
    { user_id: user3.id, current_lives: 0, max_lives: 1, last_life_lost_at: new Date(now - 9 * HOUR), is_premium: false, premium_expires_at: null },
    // Fatimah: user premium aktif -> GET /lives harus balikin unlimited=true, current_lives=null.
    { user_id: user4.id, current_lives: 1, max_lives: 1, last_life_lost_at: null, is_premium: true, premium_expires_at: new Date(now + 30 * 24 * HOUR) },
    // Fadhil: premium SUDAH KADALUARSA kemarin -> GET /lives harus auto-downgrade ke free
    //   dan kembali menghitung nyawa dari current_lives yang tersisa di row (masih regen, ~6 jam lagi).
    { user_id: user5.id, current_lives: 0, max_lives: 1, last_life_lost_at: new Date(now - 2 * HOUR), is_premium: true, premium_expires_at: new Date(now - 1 * 24 * HOUR) },
    // Hasan: nyawa baru saja habis (0), baru 5 menit lalu (baru selesai 1 kelompok ayat) ->
    //   POST /quiz/group-attempt untuk user ini harus ditolak 403 NO_LIVES_LEFT.
    //   Cocok juga buat test POST /lives/watch-ad (+1 nyawa).
    { user_id: user6.id, current_lives: 0, max_lives: 1, last_life_lost_at: new Date(now - 5 * 60 * 1000), is_premium: false, premium_expires_at: null },
  ]

  for (const lv of livesData) {
    await prisma.userLives.upsert({
      where: { user_id: lv.user_id },
      update: lv,
      create: lv,
    })
  }

  console.log('✅ Seed dummy selesai:')
  console.log(`   - 6 users total (5 di leaderboard + 1 edge-case belum onboarding)`)
  console.log(`     ${user1.email}, ${user2.email}, ${user3.email} (no leaderboard),`)
  console.log(`     ${user4.email}, ${user5.email}, ${user6.email}`)
  console.log('   - 2 asset icon, 1 background, 2 music, 2 asset bundle + items')
  console.log('   - 11 user progress row')
  console.log('   - 10 quiz question + options (setiap ayat ID & EN, semuanya tipe drag_ayat)')
  console.log('   - 4 quiz attempt')
  console.log('   - 12 user level history')
  console.log('   - 5 leaderboard snapshot (rank: Fadhil > Fatimah > Raka > Hasan > Aisyah)')
  console.log('   - 7 activity log')
  console.log('   - 6 user lives row (nyawa sekarang cuma 1, habis setelah 1 kelompok ayat selesai):')
  console.log(`       ${user1.email}      -> 1/1 nyawa (fresh/default)`)
  console.log(`       ${user2.email}   -> 0/1 nyawa, regen berikutnya ~5 jam lagi`)
  console.log(`       ${user3.email}    -> 0/1 nyawa TAPI sudah 9 jam -> auto-regen jadi 1 saat GET /lives`)
  console.log(`       ${user4.email}   -> PREMIUM aktif (unlimited)`)
  console.log(`       ${user5.email}     -> premium SUDAH EXPIRED -> auto-downgrade ke free, masih regen`)
  console.log(`       ${user6.email}      -> 0/1 nyawa, baru habis -> POST /quiz/group-attempt ditolak 403`)
  console.log('\n   Password login semua dummy user: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed dummy gagal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())