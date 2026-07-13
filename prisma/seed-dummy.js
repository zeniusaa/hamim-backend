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
  const q1 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahFatihah1.id,
      type: 'multiple_choice',
      question_text: 'Ayat pertama Al-Fatihah dimulai dengan lafaz apa?',
      language_id: bahasaId.id,
      options: {
        create: [
          { option_text: 'Bismillahirrahmanirrahim', is_correct: true, order_index: 0 },
          { option_text: 'Alhamdulillah', is_correct: false, order_index: 1 },
          { option_text: 'Iyyaka na\'budu', is_correct: false, order_index: 2 },
          { option_text: 'Maliki yaumiddin', is_correct: false, order_index: 3 },
        ],
      },
    },
    include: { options: true },
  })

  const q2 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahFatihah1.id,
      type: 'multiple_choice',
      question_text: 'The first ayah of Al-Fatihah begins with which phrase?',
      language_id: bahasaEn.id,
      options: {
        create: [
          { option_text: 'Bismillahirrahmanirrahim', is_correct: true, order_index: 0 },
          { option_text: 'Alhamdulillah', is_correct: false, order_index: 1 },
          { option_text: 'Iyyaka na\'budu', is_correct: false, order_index: 2 },
        ],
      },
    },
    include: { options: true },
  })

  const q3 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahFatihah2.id,
      type: 'drag_ayat',
      question_text: 'Susun kembali potongan ayat kedua Al-Fatihah sesuai urutan.',
      language_id: bahasaId.id,
      options: {
        create: [
          { option_text: 'الْحَمْدُ لِلَّهِ', is_correct: true, order_index: 0 },
          { option_text: 'رَبِّ الْعَالَمِينَ', is_correct: true, order_index: 1 },
        ],
      },
    },
    include: { options: true },
  })

  const q4 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahBaqarah1.id,
      type: 'multiple_choice',
      question_text: 'Surah Al-Baqarah ayat 1 terdiri dari huruf-huruf apa (huruf muqatta\'ah)?',
      language_id: bahasaId.id,
      options: {
        create: [
          { option_text: 'Alif Lam Mim', is_correct: true, order_index: 0 },
          { option_text: 'Ya Sin', is_correct: false, order_index: 1 },
          { option_text: 'Ha Mim', is_correct: false, order_index: 2 },
          { option_text: 'Kaf Ha Ya Ain Sad', is_correct: false, order_index: 3 },
        ],
      },
    },
    include: { options: true },
  })

  const q5 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahAnNas1.id,
      type: 'multiple_choice',
      question_text: 'Surah An-Nas ayat 1 memerintahkan kita berlindung kepada siapa?',
      language_id: bahasaId.id,
      options: {
        create: [
          { option_text: 'Rabb (Tuhan) manusia', is_correct: true, order_index: 0 },
          { option_text: 'Raja manusia', is_correct: false, order_index: 1 },
          { option_text: 'Malaikat', is_correct: false, order_index: 2 },
        ],
      },
    },
    include: { options: true },
  })

  const q6 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahAnNas1.id,
      type: 'multiple_choice',
      question_text: 'Surah An-Nas ayah 1 tells us to seek refuge with whom?',
      language_id: bahasaEn.id,
      options: {
        create: [
          { option_text: 'The Lord of mankind', is_correct: true, order_index: 0 },
          { option_text: 'The King of mankind', is_correct: false, order_index: 1 },
          { option_text: 'The angels', is_correct: false, order_index: 2 },
        ],
      },
    },
    include: { options: true },
  })

  const q7 = await prisma.quizQuestion.create({
    data: {
      ayah_id: ayahIkhlas1.id,
      type: 'drag_ayat',
      question_text: 'Susun kembali potongan Surah Al-Ikhlas ayat 1 sesuai urutan.',
      language_id: bahasaId.id,
      options: {
        create: [
          { option_text: 'قُلْ هُوَ اللَّهُ', is_correct: true, order_index: 0 },
          { option_text: 'أَحَدٌ', is_correct: true, order_index: 1 },
        ],
      },
    },
    include: { options: true },
  })

  // ─── 8. User Quiz Attempt ────────────────────────────────────
  const correctOptionQ1 = q1.options.find((o) => o.is_correct)
  const wrongOptionQ1 = q1.options.find((o) => !o.is_correct)
  const correctOptionQ4 = q4.options.find((o) => o.is_correct)
  const correctOptionQ5 = q5.options.find((o) => o.is_correct)

  await prisma.userQuizAttempt.create({
    data: { user_id: user1.id, question_id: q1.id, selected_option_id: wrongOptionQ1.id, is_correct: false, time_taken_seconds: 8.2 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user1.id, question_id: q1.id, selected_option_id: correctOptionQ1.id, is_correct: true, time_taken_seconds: 4.1 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user2.id, question_id: q4.id, selected_option_id: correctOptionQ4.id, is_correct: true, time_taken_seconds: 6.0 },
  })
  await prisma.userQuizAttempt.create({
    data: { user_id: user5.id, question_id: q5.id, selected_option_id: correctOptionQ5.id, is_correct: true, time_taken_seconds: 3.4 },
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

  console.log('✅ Seed dummy selesai:')
  console.log(`   - 6 users total (5 di leaderboard + 1 edge-case belum onboarding)`)
  console.log(`     ${user1.email}, ${user2.email}, ${user3.email} (no leaderboard),`)
  console.log(`     ${user4.email}, ${user5.email}, ${user6.email}`)
  console.log('   - 2 asset icon, 1 background, 2 music, 2 asset bundle + items')
  console.log('   - 11 user progress row')
  console.log('   - 7 quiz question + options (mix ID/EN, multiple_choice/drag_ayat)')
  console.log('   - 4 quiz attempt')
  console.log('   - 12 user level history')
  console.log('   - 5 leaderboard snapshot (rank: Fadhil > Fatimah > Raka > Hasan > Aisyah)')
  console.log('   - 7 activity log')
  console.log('\n   Password login semua dummy user: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed dummy gagal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())