const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { prisma } = require('../../config/database')
const { isAdminUser } = require('../../middlewares/admin')
const HttpError = require('../../utils/HttpError')

// Token admin = access token JWT biasa, tapi umurnya lebih panjang (default 12 jam)
// supaya admin web tidak perlu login ulang setiap beberapa jam.
// Login admin TIDAK memakai tabel RefreshToken/rotasi — mekanisme refresh
// token itu untuk user app mobile. Admin cukup satu token aja.
const generateAdminToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_TOKEN_EXPIRES_IN || '12h' }
  )

// POST /admin/login — login khusus dashboard admin web.
// Beda dari /auth/login:
//   - Hanya menerima akun ber-role ADMIN (atau email di env ADMIN_EMAILS)
//   - Tidak mengirim refresh token
//   - Pesan error tetap generik (anti user enumeration, sama seperti login user)
const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password_hash) {
    throw new HttpError('Email atau password salah.', 401)
  }

  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) {
    throw new HttpError('Email atau password salah.', 401)
  }

  // Kunci pembeda dari login user biasa: wajib admin.
  if (!isAdminUser(user)) {
    throw new HttpError('Akses ditolak. Akun ini tidak terdaftar sebagai admin.', 403)
  }

  const accessToken = generateAdminToken(user)

  return {
    admin: { id: user.id, email: user.email, role: user.role },
    accessToken,
  }
}

// GET /admin/me — data admin yang sedang login (dipakai frontend untuk
// ngecek token masih valid saat halaman di-refresh).
const me = async (adminId) => {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, role: true, created_at: true },
  })

  if (!user) {
    throw new HttpError('Admin tidak ditemukan.', 404)
  }

  return user
}

// ─── Fase 1: Manajemen User ────────────────────────────────────────

// GET /admin/users — list user + search + filter + pagination.
// Semua user ditampilkan TERMASUK yang soft-deleted (deleted_at terisi),
// karena admin harus bisa lihat siapa yang sedang dalam masa tunggu hapus
// (30 hari) dan punya opsi restore.
const listUsers = async ({ search, page, limit, role, premium }) => {
  const where = {}

  if (search) {
    // Catatan: tanpa mode:'insensitive' — itu fitur PostgreSQL. Collation
    // MySQL (utf8mb4_unicode_ci) sudah case-insensitive secara default.
    where.OR = [
      { email: { contains: search } },
      { profile: { display_name: { contains: search } } },
    ]
  }
  if (role) where.role = role
  if (premium === 'true' || premium === 'false') {
    where.lives = { is_premium: premium === 'true' }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone_number: true,
        role: true,
        email_verified: true,
        is_onboarded: true,
        deleted_at: true,
        created_at: true,
        profile: { select: { display_name: true, avatar_url: true } },
        lives: {
          select: { current_lives: true, max_lives: true, is_premium: true, premium_expires_at: true },
        },
        leaderboard_snapshot: {
          select: { total_juz_completed: true, current_level: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

// GET /admin/users/:id — detail lengkap 1 user:
// profil, lives/premium, snapshot level, statistik belajar, riwayat level.
const getUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      lives: true,
      leaderboard_snapshot: true,
      language: { select: { code: true, name: true } },
    },
  })

  if (!user) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  const [ayahCompleted, quizAttempts, quizCorrect] = await Promise.all([
    prisma.userProgress.count({ where: { user_id: userId, is_completed: true } }),
    prisma.userQuizAttempt.count({ where: { user_id: userId } }),
    prisma.userQuizAttempt.count({ where: { user_id: userId, is_correct: true } }),
  ])

  const levels = await prisma.userLevel.findMany({
    where: { user_id: userId },
    orderBy: { level: 'desc' },
    take: 10,
  })

  // ── Riwayat progress terbaru: juz berapa, surah apa, kelompok ayat berapa ──
  // "Kelompok ayat" = range ayat yang dicover 1 audio (audio_order), sama seperti
  // yang dipakai app (GET /audio/surah/:surahId/groups).
  const progressRows = await prisma.userProgress.findMany({
    where: { user_id: userId, is_completed: true },
    orderBy: { completed_at: 'desc' },
    take: 10,
    include: {
      ayah: {
        include: {
          surah: { select: { id: true, number: true, name_transliteration: true } },
        },
      },
    },
  })

  // Load kelompok audio per surah yang muncul di riwayat (1 query per surah)
  const surahIds = [...new Set(progressRows.map((p) => p.ayah.surah_id))]
  const groupsBySurah = new Map()
  for (const sid of surahIds) {
    const files = await prisma.audioFile.findMany({
      where: { ayah: { surah_id: sid } },
      orderBy: { audio_order: 'asc' },
      select: {
        audio_order: true,
        ayah_end_number: true,
        qari_name: true,
        ayah: { select: { ayah_number: true } },
      },
    })
    groupsBySurah.set(
      sid,
      files.map((f) => ({
        audio_order: f.audio_order,
        ayah_start: f.ayah.ayah_number,
        ayah_end: f.ayah_end_number ?? f.ayah.ayah_number,
        qari_name: f.qari_name,
      }))
    )
  }

  const recent_progress = progressRows.map((p) => {
    const groups = groupsBySurah.get(p.ayah.surah_id) || []
    const group =
      groups.find((g) => p.ayah.ayah_number >= g.ayah_start && p.ayah.ayah_number <= g.ayah_end) || null
    return {
      ayah_id: p.ayah_id,
      stage: p.stage,
      completed_at: p.completed_at,
      ayah_number: p.ayah.ayah_number,
      juz_number: p.ayah.juz_number,
      surah: {
        id: p.ayah.surah_id,
        number: p.ayah.surah.number,
        name_transliteration: p.ayah.surah.name_transliteration,
      },
      group,
    }
  })

  return {
    ...user,
    stats: {
      ayah_completed: ayahCompleted,
      quiz_attempts: quizAttempts,
      quiz_correct: quizCorrect,
    },
    level_history: levels,
    recent_progress,
  }
}

// PATCH /admin/users/:id/premium — kasih/tarik premium.
//   is_premium: true + duration_days → premium aktif selama N hari
//   is_premium: true  tanpa duration → premium PERMANEN (expires null)
//   is_premium: false → premium dicabut
// Logika "premium aktif" konsisten dengan lives.service: is_premium && expires
// kosong/lebih besar dari sekarang.
const setPremium = async (userId, { is_premium, duration_days }) => {
  const lives = await prisma.userLives.findUnique({ where: { user_id: userId } })
  if (!lives) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  let premium_expires_at = null
  if (is_premium && duration_days && duration_days > 0) {
    premium_expires_at = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)
  }

  const updated = await prisma.userLives.update({
    where: { user_id: userId },
    data: { is_premium, premium_expires_at },
  })

  return { is_premium: updated.is_premium, premium_expires_at: updated.premium_expires_at }
}

// PATCH /admin/users/:id/lives — reset nyawa user.
// Tanpa body: nyawa dikembalikan penuh (ke max_lives) + timer regen di-nolkan.
// Dengan body { current_lives }: set ke angka tertentu (0 = nyawa habis).
const resetLives = async (userId, { current_lives }) => {
  const lives = await prisma.userLives.findUnique({ where: { user_id: userId } })
  if (!lives) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  const updated = await prisma.userLives.update({
    where: { user_id: userId },
    data: {
      current_lives: current_lives ?? lives.max_lives,
      last_life_lost_at: null,
    },
  })

  return { current_lives: updated.current_lives, max_lives: updated.max_lives }
}

// DELETE /admin/users/:id — nonaktifkan akun (soft delete, mekanisme yang
// SAMA dengan "hapus akun" di app: deleted_at terisi, refresh token langsung
// ditolak, dan scheduler membersihkan permanen setelah 30 hari).
// Catatan: sesuai desain app, user yang soft-deleted bisa memulihkan akunnya
// sendiri dengan login ulang. Kalau butuh "ban keras" tanpa bisa restore,
// itu butuh flag terpisah (bisa dibahas di fase berikutnya).
const softDeleteUser = async (adminId, userId) => {
  if (adminId === userId) {
    throw new HttpError('Admin tidak bisa menonaktifkan akun sendiri.', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { deleted_at: new Date() },
  })

  return { id: updated.id, deleted_at: updated.deleted_at }
}

// POST /admin/users/:id/restore — batalkan soft delete (deleted_at → null).
const restoreUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { deleted_at: null },
  })

  return { id: updated.id, deleted_at: updated.deleted_at }
}

// POST /admin/users/:id/reset-progress — reset total progres belajar user:
// hapus semua UserProgress, UserQuizAttempt, riwayat level, dan kembalikan
// snapshot leaderboard ke level 1 / 0 juz. Lives TIDAK disentuh (bisa
// direset terpisah lewat PATCH /lives). Semua dalam 1 transaksi.
const resetProgress = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) {
    throw new HttpError('User tidak ditemukan.', 404)
  }

  const result = await prisma.$transaction(async (tx) => {
    const progress = await tx.userProgress.deleteMany({ where: { user_id: userId } })
    const attempts = await tx.userQuizAttempt.deleteMany({ where: { user_id: userId } })
    const levels = await tx.userLevel.deleteMany({ where: { user_id: userId } })
    await tx.leaderboardSnapshot.updateMany({
      where: { user_id: userId },
      data: { total_juz_completed: 0, current_level: 1 },
    })
    return {
      progress_deleted: progress.count,
      attempts_deleted: attempts.count,
      levels_deleted: levels.count,
    }
  })

  return result
}

// ─── Fase 2: Manajemen Konten ───────────────────────────────────────

// ---------- SURAH ----------

// GET /admin/surahs — list surah + search + pagination
const listSurahs = async ({ search, page, limit }) => {
  const where = search
    ? {
        OR: [
          { name_arabic: { contains: search } },
          { name_transliteration: { contains: search } },
          { name_translation_id: { contains: search } },
          { number: /^\d+$/.test(search) ? Number(search) : undefined },
        ].filter((x) => x && x.number !== undefined || x && !('number' in x)),
      }
    : {}

  const [surahs, total] = await Promise.all([
    prisma.surah.findMany({
      where,
      include: { _count: { select: { ayahs: true } } },
      orderBy: { number: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.surah.count({ where }),
  ])

  return { surahs, pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } }
}

// GET /admin/surahs/:id — detail + daftar ayat
const getSurah = async (id) => {
  const surah = await prisma.surah.findUnique({
    where: { id },
    include: {
      _count: { select: { ayahs: true, activity_logs: true } },
      ayahs: {
        select: { id: true, ayah_number: true, juz_number: true },
        orderBy: { ayah_number: 'asc' },
      },
    },
  })
  if (!surah) throw new HttpError('Surah tidak ditemukan.', 404)

  // Kelompok ayat = range ayat yang dicover 1 audio (audio_order), sama seperti
  // yang dipakai app di stage listening/quiz (GET /audio/surah/:surahId/groups).
  const audioFiles = await prisma.audioFile.findMany({
    where: { ayah: { surah_id: id } },
    orderBy: { audio_order: 'asc' },
    select: {
      id: true,
      audio_order: true,
      ayah_end_number: true,
      qari_name: true,
      duration_seconds: true,
      ayah: { select: { ayah_number: true } },
    },
  })

  const groups = audioFiles.map((af) => {
    const ayah_start = af.ayah.ayah_number
    const ayah_end = af.ayah_end_number ?? ayah_start
    return {
      audio_id: af.id,
      audio_order: af.audio_order,
      qari_name: af.qari_name,
      duration_seconds: af.duration_seconds,
      ayah_start,
      ayah_end,
      ayah_count: ayah_end - ayah_start + 1,
    }
  })

  return {
    ...surah,
    total_groups: groups.length,
    groups,
  }
}

// POST /admin/surahs
const createSurah = async (data) => {
  try {
    return await prisma.surah.create({ data })
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError('Nomor surah sudah dipakai.', 409)
    throw e
  }
}

// PATCH /admin/surahs/:id
const updateSurah = async (id, data) => {
  try {
    return await prisma.surah.update({ where: { id }, data })
  } catch (e) {
    if (e.code === 'P2025') throw new HttpError('Surah tidak ditemukan.', 404)
    if (e.code === 'P2002') throw new HttpError('Nomor surah sudah dipakai.', 409)
    throw e
  }
}

// DELETE /admin/surahs/:id — hanya boleh kalau belum ada data user
// (progress, activity log, riwayat quiz) yang mereferensikan surah ini.
const deleteSurah = async (id) => {
  const surah = await prisma.surah.findUnique({
    where: { id },
    include: { _count: { select: { activity_logs: true } } },
  })
  if (!surah) throw new HttpError('Surah tidak ditemukan.', 404)

  const ayahs = await prisma.ayah.findMany({ where: { surah_id: id }, select: { id: true } })
  const ayahIds = ayahs.map((a) => a.id)

  const progressCount = ayahIds.length
    ? await prisma.userProgress.count({ where: { ayah_id: { in: ayahIds } } })
    : 0
  const questionIds = ayahIds.length
    ? (await prisma.quizQuestion.findMany({ where: { ayah_id: { in: ayahIds } }, select: { id: true } })).map((q) => q.id)
    : []
  const attemptCount = questionIds.length
    ? await prisma.userQuizAttempt.count({ where: { question_id: { in: questionIds } } })
    : 0

  if (surah._count.activity_logs > 0 || progressCount > 0 || attemptCount > 0) {
    throw new HttpError('Surah sudah punya progress/aktivitas user — tidak bisa dihapus.', 409)
  }

  await prisma.$transaction(async (tx) => {
    if (questionIds.length) {
      await tx.quizOption.deleteMany({ where: { question_id: { in: questionIds } } })
      await tx.quizQuestion.deleteMany({ where: { id: { in: questionIds } } })
    }
    if (ayahIds.length) {
      await tx.audioFile.deleteMany({ where: { ayah_id: { in: ayahIds } } })
      await tx.ayah.deleteMany({ where: { id: { in: ayahIds } } })
    }
    await tx.surah.delete({ where: { id } })
  })

  return { id }
}

// ---------- AYAH ----------

// Sync kolom total_ayah surah dengan jumlah ayat sebenarnya (dipakai
// level calc & kelompok audio). Dipanggil tiap create/delete ayah.
const syncSurahTotalAyah = async (surahId) => {
  const count = await prisma.ayah.count({ where: { surah_id: surahId } })
  await prisma.surah.update({ where: { id: surahId }, data: { total_ayah: count } })
  return count
}

// GET /admin/surahs/:id/ayahs — list ayat per surah
const listAyahs = async (surahId, { page, limit }) => {
  const surah = await prisma.surah.findUnique({ where: { id: surahId } })
  if (!surah) throw new HttpError('Surah tidak ditemukan.', 404)

  const [ayahs, total] = await Promise.all([
    prisma.ayah.findMany({
      where: { surah_id: surahId },
      orderBy: { ayah_number: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { quiz_questions: true, audio_files: true } } },
    }),
    prisma.ayah.count({ where: { surah_id: surahId } }),
  ])

  return { ayahs, pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } }
}

// GET /admin/ayahs/:id — detail ayat + audio + soal quiz (termasuk kunci)
const getAyah = async (id) => {
  const ayah = await prisma.ayah.findUnique({
    where: { id },
    include: {
      surah: { select: { id: true, number: true, name_transliteration: true } },
      audio_files: { orderBy: { audio_order: 'asc' } },
      quiz_questions: {
        include: {
          options: { orderBy: { order_index: 'asc' } },
          language: { select: { code: true } },
        },
      },
    },
  })
  if (!ayah) throw new HttpError('Ayah tidak ditemukan.', 404)
  return ayah
}

// POST /admin/surahs/:id/ayahs
const createAyah = async (surahId, data) => {
  const surah = await prisma.surah.findUnique({ where: { id: surahId } })
  if (!surah) throw new HttpError('Surah tidak ditemukan.', 404)

  let ayah
  try {
    ayah = await prisma.ayah.create({ data: { ...data, surah_id: surahId } })
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError(`Ayat nomor ${data.ayah_number} sudah ada di surah ini.`, 409)
    throw e
  }

  await syncSurahTotalAyah(surahId)
  return ayah
}

// PATCH /admin/ayahs/:id
const updateAyah = async (id, data) => {
  try {
    return await prisma.ayah.update({ where: { id }, data })
  } catch (e) {
    if (e.code === 'P2025') throw new HttpError('Ayah tidak ditemukan.', 404)
    if (e.code === 'P2002') throw new HttpError(`Ayat nomor ${data.ayah_number} sudah ada di surah ini.`, 409)
    throw e
  }
}

// DELETE /admin/ayahs/:id — hanya boleh kalau belum ada progress/riwayat quiz
const deleteAyah = async (id) => {
  const ayah = await prisma.ayah.findUnique({
    where: { id },
    select: { id: true, surah_id: true },
  })
  if (!ayah) throw new HttpError('Ayah tidak ditemukan.', 404)

  const progressCount = await prisma.userProgress.count({ where: { ayah_id: id } })
  const questionIds = (await prisma.quizQuestion.findMany({ where: { ayah_id: id }, select: { id: true } })).map((q) => q.id)
  const attemptCount = questionIds.length
    ? await prisma.userQuizAttempt.count({ where: { question_id: { in: questionIds } } })
    : 0

  if (progressCount > 0 || attemptCount > 0) {
    throw new HttpError('Ayah ini sudah punya progress/riwayat quiz user — tidak bisa dihapus.', 409)
  }

  await prisma.$transaction(async (tx) => {
    if (questionIds.length) {
      await tx.quizOption.deleteMany({ where: { question_id: { in: questionIds } } })
      await tx.quizQuestion.deleteMany({ where: { id: { in: questionIds } } })
    }
    await tx.audioFile.deleteMany({ where: { ayah_id: id } })
    await tx.ayah.delete({ where: { id } })
  })

  await syncSurahTotalAyah(ayah.surah_id)
  return { id }
}

// ---------- QUIZ QUESTION ----------

// GET /admin/ayahs/:id/questions — list soal 1 ayat
const listQuestions = async (ayahId) => {
  const ayah = await prisma.ayah.findUnique({ where: { id: ayahId }, select: { id: true } })
  if (!ayah) throw new HttpError('Ayah tidak ditemukan.', 404)

  const questions = await prisma.quizQuestion.findMany({
    where: { ayah_id: ayahId },
    orderBy: { question_text: 'asc' },
    include: {
      options: { orderBy: { order_index: 'asc' } },
      language: { select: { code: true, name: true } },
      _count: { select: { attempts: true } },
    },
  })
  return questions
}

// POST /admin/ayahs/:id/questions — buat soal + options sekaligus
const createQuestion = async (ayahId, { type, question_text, language_id, options }) => {
  const ayah = await prisma.ayah.findUnique({ where: { id: ayahId }, select: { id: true } })
  if (!ayah) throw new HttpError('Ayah tidak ditemukan.', 404)

  const language = await prisma.language.findUnique({ where: { id: language_id } })
  if (!language) throw new HttpError('Bahasa tidak ditemukan.', 404)

  return prisma.quizQuestion.create({
    data: {
      ayah_id: ayahId,
      type,
      question_text,
      language_id,
      options: { create: options },
    },
    include: { options: { orderBy: { order_index: 'asc' } } },
  })
}

// PATCH /admin/questions/:id — update soal & (opsional) ganti total options.
// Options TIDAK boleh diubah kalau soal sudah punya riwayat jawaban user
// (kalau dipaksa, Prisma kena FK Restrict dari UserQuizAttempt).
const updateQuestion = async (id, { question_text, language_id, options }) => {
  const question = await prisma.quizQuestion.findUnique({ where: { id: id }, select: { id: true } })
  if (!question) throw new HttpError('Soal tidak ditemukan.', 404)

  if (options) {
    const attemptCount = await prisma.userQuizAttempt.count({ where: { question_id: id } })
    if (attemptCount > 0) {
      throw new HttpError('Soal sudah punya riwayat jawaban user — options tidak bisa diganti. Hapus soal ini lalu buat baru.', 409)
    }
  }

  return prisma.quizQuestion.update({
    where: { id },
    data: {
      ...(question_text !== undefined ? { question_text } : {}),
      ...(language_id !== undefined ? { language_id } : {}),
      ...(options ? { options: { deleteMany: {}, create: options } } : {}),
    },
    include: { options: { orderBy: { order_index: 'asc' } } },
  })
}

// DELETE /admin/questions/:id
const deleteQuestion = async (id) => {
  const question = await prisma.quizQuestion.findUnique({ where: { id }, select: { id: true } })
  if (!question) throw new HttpError('Soal tidak ditemukan.', 404)

  const attemptCount = await prisma.userQuizAttempt.count({ where: { question_id: id } })
  if (attemptCount > 0) {
    throw new HttpError('Soal sudah punya riwayat jawaban user — tidak bisa dihapus.', 409)
  }

  await prisma.quizQuestion.delete({ where: { id } })
  return { id }
}

// ---------- ASSETS ----------

// GET /admin/assets — semua aset: ikon, background, musik, bundle
const listAssets = async () => {
  const [icons, backgrounds, music, bundles] = await Promise.all([
    prisma.assetIcon.findMany({ orderBy: { name: 'asc' } }),
    prisma.assetBackground.findMany({ orderBy: { name: 'asc' } }),
    prisma.assetMusic.findMany({ orderBy: { name: 'asc' } }),
    prisma.assetBundle.findMany({
      orderBy: { name: 'asc' },
      include: {
        bundle_items: true,
        _count: { select: { downloaded_by_users: true } },
      },
    }),
  ])
  return { icons, backgrounds, music, bundles }
}

// POST /admin/assets/bundles/:id/bump-version — naikkan versi bundle
// (app mobile pakai versi ini untuk deteksi update via /assets/check-updates)
const bumpBundleVersion = async (bundleId) => {
  const bundle = await prisma.assetBundle.findUnique({ where: { id: bundleId } })
  if (!bundle) throw new HttpError('Bundle tidak ditemukan.', 404)

  const updated = await prisma.assetBundle.update({
    where: { id: bundleId },
    data: { version: { increment: 1 } },
  })
  return { id: updated.id, name: updated.name, version: updated.version }
}

// ─── Fase 3: Analytics ─────────────────────────────────────────────

// Key tanggal lokal (bukan UTC) supaya grouping per hari sesuai zona server (WIB).
const localDateKey = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// GET /admin/analytics/overview — ringkasan besar: user, konten, pembelajaran, aktivitas.
const analyticsOverview = async () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers, totalDeleted, premiumActive, totalAdmins,
    surahCount, ayahCount, questionCount, optionCount,
    progressCompleted, quizAttempts, quizCorrect, activeToday, newUsers7d,
  ] = await Promise.all([
    prisma.user.count({ where: { deleted_at: null } }),
    prisma.user.count({ where: { deleted_at: { not: null } } }),
    prisma.userLives.count({
      where: {
        is_premium: true,
        OR: [{ premium_expires_at: null }, { premium_expires_at: { gt: new Date() } }],
      },
    }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.surah.count(),
    prisma.ayah.count(),
    prisma.quizQuestion.count(),
    prisma.quizOption.count(),
    prisma.userProgress.count({ where: { is_completed: true } }),
    prisma.userQuizAttempt.count(),
    prisma.userQuizAttempt.count({ where: { is_correct: true } }),
    prisma.userActivityLog.count({ where: { created_at: { gte: startOfToday } } }),
    prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } }),
  ])

  return {
    users: {
      total: totalUsers,
      deleted: totalDeleted,
      premium_active: premiumActive,
      admins: totalAdmins,
      new_7d: newUsers7d,
    },
    content: {
      surahs: surahCount,
      ayahs: ayahCount,
      quiz_questions: questionCount,
      quiz_options: optionCount,
    },
    learning: {
      ayah_completed: progressCompleted,
      quiz_attempts: quizAttempts,
      quiz_correct: quizCorrect,
      accuracy: quizAttempts ? Number(((quizCorrect / quizAttempts) * 100).toFixed(1)) : 0,
    },
    activity: { active_today: activeToday },
  }
}

// GET /admin/analytics/leaderboard?limit=50 — top user by juz selesai + level.
const analyticsLeaderboard = async ({ limit }) => {
  const entries = await prisma.leaderboardSnapshot.findMany({
    take: limit,
    orderBy: [
      { total_juz_completed: 'desc' },
      { current_level: 'desc' },
      { updated_at: 'asc' },
    ],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          deleted_at: true,
          profile: { select: { display_name: true, avatar_url: true } },
        },
      },
    },
  })

  return entries.map((e, idx) => ({
    rank: idx + 1,
    user_id: e.user_id,
    display_name: e.user.profile?.display_name || null,
    email: e.user.email,
    deleted: !!e.user.deleted_at,
    total_juz_completed: e.total_juz_completed,
    current_level: e.current_level,
    updated_at: e.updated_at,
  }))
}

// GET /admin/analytics/quiz-activity?days=7 — jumlah attempt & benar per hari.
const analyticsQuizActivity = async ({ days }) => {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const attempts = await prisma.userQuizAttempt.findMany({
    where: { attempted_at: { gte: since } },
    select: { attempted_at: true, is_correct: true },
  })

  const byDate = new Map()
  for (const a of attempts) {
    const key = localDateKey(a.attempted_at)
    const entry = byDate.get(key) || { date: key, attempts: 0, correct: 0 }
    entry.attempts++
    if (a.is_correct) entry.correct++
    byDate.set(key, entry)
  }

  // Isi hari-hari tanpa aktivitas dengan nol (biar grafik kontinu)
  const out = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = localDateKey(d)
    out.push(byDate.get(key) || { date: key, attempts: 0, correct: 0 })
  }
  return out
}

// GET /admin/analytics/user-growth?days=14 — jumlah user baru per hari.
const analyticsUserGrowth = async ({ days }) => {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const users = await prisma.user.findMany({
    where: { created_at: { gte: since } },
    select: { created_at: true },
  })

  const byDate = new Map()
  for (const u of users) {
    const key = localDateKey(u.created_at)
    byDate.set(key, (byDate.get(key) || 0) + 1)
  }

  const out = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = localDateKey(d)
    out.push({ date: key, new_users: byDate.get(key) || 0 })
  }
  return out
}

module.exports = {
  login,
  me,
  listUsers,
  getUser,
  setPremium,
  resetLives,
  softDeleteUser,
  restoreUser,
  resetProgress,
  listSurahs,
  getSurah,
  createSurah,
  updateSurah,
  deleteSurah,
  listAyahs,
  getAyah,
  createAyah,
  updateAyah,
  deleteAyah,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAssets,
  bumpBundleVersion,
  analyticsOverview,
  analyticsLeaderboard,
  analyticsQuizActivity,
  analyticsUserGrowth,
}
