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
  if (!alFatihah || !alBaqarah) {
    throw new Error('Data surah belum ada. Jalankan dulu: node prisma/seed.js')
  }

  const ayahFatihah1 = await prisma.ayah.findUnique({
    where: { surah_id_ayah_number: { surah_id: alFatihah.id, ayah_number: 1 } },
  })
  const ayahFatihah2 = await prisma.ayah.findUnique({
    where: { surah_id_ayah_number: { surah_id: alFatihah.id, ayah_number: 2 } },
  })
  const ayahBaqarah1 = await prisma.ayah.findUnique({
    where: { surah_id_ayah_number: { surah_id: alBaqarah.id, ayah_number: 1 } },
  })
  if (!ayahFatihah1 || !ayahFatihah2 || !ayahBaqarah1) {
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

  // ─── 8. User Quiz Attempt ────────────────────────────────────
  const correctOptionQ1 = q1.options.find((o) => o.is_correct)
  const wrongOptionQ1 = q1.options.find((o) => !o.is_correct)

  await prisma.userQuizAttempt.create({
    data: {
      user_id: user1.id,
      question_id: q1.id,
      selected_option_id: wrongOptionQ1.id,
      is_correct: false,
      time_taken_seconds: 8.2,
    },
  })
  await prisma.userQuizAttempt.create({
    data: {
      user_id: user1.id,
      question_id: q1.id,
      selected_option_id: correctOptionQ1.id,
      is_correct: true,
      time_taken_seconds: 4.1,
    },
  })

  // ─── 9. User Level (riwayat naik level) ─────────────────────
  await prisma.userLevel.createMany({
    data: [
      { user_id: user1.id, level: 1, achieved_at: new Date('2026-06-01') },
      { user_id: user1.id, level: 2, achieved_at: new Date('2026-06-15') },
      { user_id: user1.id, level: 3, achieved_at: new Date('2026-07-01') },
      { user_id: user2.id, level: 1, achieved_at: new Date('2026-07-05') },
    ],
  })

  // ─── 10. Leaderboard Snapshot ────────────────────────────────
  await prisma.leaderboardSnapshot.upsert({
    where: { user_id: user1.id },
    update: {},
    create: { user_id: user1.id, total_juz_completed: 1, current_level: 3 },
  })
  await prisma.leaderboardSnapshot.upsert({
    where: { user_id: user2.id },
    update: {},
    create: { user_id: user2.id, total_juz_completed: 0, current_level: 1 },
  })

  // ─── 11. User Activity Log ───────────────────────────────────
  await prisma.userActivityLog.createMany({
    data: [
      { user_id: user1.id, surah_id: alFatihah.id, ayah_id: ayahFatihah1.id, activity_type: 'listening_completed', score: null, duration_seconds: 12.5 },
      { user_id: user1.id, surah_id: alFatihah.id, ayah_id: ayahFatihah1.id, activity_type: 'quiz_completed', score: 50, duration_seconds: 12.3 },
      { user_id: user2.id, surah_id: alBaqarah.id, ayah_id: ayahBaqarah1.id, activity_type: 'listening_completed', score: null, duration_seconds: 9.8 },
    ],
  })

  console.log('✅ Seed dummy selesai:')
  console.log(`   - 3 users (${user1.email}, ${user2.email}, ${user3.email})`)
  console.log('   - 2 asset icon, 1 background, 2 music')
  console.log('   - 2 asset bundle + bundle items')
  console.log('   - 5 user progress, 3 quiz question + options, 2 quiz attempt')
  console.log('   - 4 user level, 2 leaderboard snapshot, 3 activity log')
  console.log('\n   Password login semua dummy user: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed dummy gagal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())