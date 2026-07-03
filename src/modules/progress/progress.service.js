const { prisma } = require('../../config/database')
const { checkAndUpdateLevel } = require('../level/level.service')

// Ambil semua progress user, dikelompokkan per surat
const getProgress = async (userId) => {
  const progressList = await prisma.userProgress.findMany({
    where: { user_id: userId },
    include: {
      ayah: {
        select: {
          id: true,
          ayah_number: true,
          juz_number: true,
          surah: {
            select: { id: true, number: true, name_transliteration: true, total_ayah: true },
          },
        },
      },
    },
    orderBy: [{ ayah: { surah_id: 'asc' } }, { ayah: { ayah_number: 'asc' } }],
  })

  // Kelompokkan per surat
  const surahMap = {}
  progressList.forEach((p) => {
    const surahId = p.ayah.surah.id
    if (!surahMap[surahId]) {
      surahMap[surahId] = {
        surah: p.ayah.surah,
        stages_completed: { listening: 0, reading: 0, quiz: 0 },
        ayahs: [],
      }
    }
    surahMap[surahId].ayahs.push({
      ayah_id: p.ayah_id,
      ayah_number: p.ayah.ayah_number,
      juz_number: p.ayah.juz_number,
      stage: p.stage,
      is_completed: p.is_completed,
      completed_at: p.completed_at,
      attempt_count: p.attempt_count,
    })
    if (p.is_completed) {
      surahMap[surahId].stages_completed[p.stage] =
        (surahMap[surahId].stages_completed[p.stage] || 0) + 1
    }
  })

  return Object.values(surahMap)
}

// Riwayat aktivitas dengan pagination
const getHistory = async (userId, page, limit) => {
  const skip = (page - 1) * limit
  const [logs, total] = await Promise.all([
    prisma.userActivityLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        activity_type: true,
        score: true,
        duration_seconds: true,
        created_at: true,
        ayah_id: true,
        surah: { select: { id: true, number: true, name_transliteration: true } },
      },
    }),
    prisma.userActivityLog.count({ where: { user_id: userId } }),
  ])

  return {
    logs,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  }
}

// Update progress 1 stage + catat log + cek level naik
//
// Untuk stage 'listening':
//   - kirim ayah_ids[] = semua ayah_id dalam 1 kelompok audio (wajib)
//   - ayah_id = ayah_id pertama dalam kelompok (untuk activity log)
//   - semua ayat dalam kelompok langsung ditandai selesai listening
//
// Untuk stage 'reading' & 'quiz':
//   - cukup kirim ayah_id tunggal (per ayat individual)
const updateProgress = async (userId, { ayah_id, ayah_ids, surah_id, stage, score, duration_seconds }) => {
  let updatedProgress = []

  if (stage === 'listening') {
    // Mark semua ayat dalam kelompok audio sekaligus
    // ayah_ids = array semua ayah_id dalam kelompok (dikirim dari app)
    // Fallback ke [ayah_id] kalau app belum kirim ayah_ids
    const targetIds = Array.isArray(ayah_ids) && ayah_ids.length > 0 ? ayah_ids : [ayah_id]

    updatedProgress = await Promise.all(
      targetIds.map((id) =>
        prisma.userProgress.upsert({
          where: { user_id_ayah_id_stage: { user_id: userId, ayah_id: id, stage: 'listening' } },
          update: { is_completed: true, completed_at: new Date(), attempt_count: { increment: 1 } },
          create: { user_id: userId, ayah_id: id, stage: 'listening', is_completed: true, completed_at: new Date(), attempt_count: 1 },
        })
      )
    )

    // Catat 1 activity log mewakili kelompok (pakai ayah_id pertama)
    await prisma.userActivityLog.create({
      data: {
        user_id: userId,
        surah_id,
        ayah_id,
        activity_type: 'listening',
        duration_seconds: duration_seconds ?? null,
      },
    })

  } else {
    // reading & quiz: per ayat individual
    const progress = await prisma.userProgress.upsert({
      where: { user_id_ayah_id_stage: { user_id: userId, ayah_id, stage } },
      update: { is_completed: true, completed_at: new Date(), attempt_count: { increment: 1 } },
      create: { user_id: userId, ayah_id, stage, is_completed: true, completed_at: new Date(), attempt_count: 1 },
    })
    updatedProgress = [progress]

    // Catat activity log
    await prisma.userActivityLog.create({
      data: {
        user_id: userId,
        surah_id,
        ayah_id,
        activity_type: stage === 'quiz' ? 'quiz_completed' : stage,
        score: score ?? null,
        duration_seconds: duration_seconds ?? null,
      },
    })
  }

  // Cek apakah surat ini sudah selesai semua stage semua ayat (hanya saat quiz selesai)
  let levelResult = null
  if (stage === 'quiz') {
    const surah = await prisma.surah.findUnique({
      where: { id: surah_id },
      select: { total_ayah: true },
    })

    if (surah) {
      const completedQuizCount = await prisma.userProgress.count({
        where: {
          user_id: userId,
          stage: 'quiz',
          is_completed: true,
          ayah: { surah_id },
        },
      })

      if (completedQuizCount >= surah.total_ayah) {
        // Catat surah selesai
        await prisma.userActivityLog.create({
          data: { user_id: userId, surah_id, ayah_id: null, activity_type: 'surah_completed' },
        })

        // Cek naik level
        levelResult = await checkAndUpdateLevel(userId)
        if (levelResult.leveled_up) {
          console.log(`🎉 [LEVEL UP] User ${userId}: Level ${levelResult.old_level} → ${levelResult.new_level}`)
        }
      }
    }
  }

  return {
    progress: updatedProgress,
    level_update: levelResult,
  }
}

// Progress detail 1 surat (per ayat, per stage)
const getProgressBySurah = async (userId, surahId) => {
  const surah = await prisma.surah.findUnique({
    where: { id: surahId },
    select: { id: true, number: true, name_transliteration: true, total_ayah: true, juz_start: true },
  })
  if (!surah) throw new Error('SURAH_NOT_FOUND')

  const [ayahs, progressList] = await Promise.all([
    prisma.ayah.findMany({
      where: { surah_id: surahId },
      orderBy: { ayah_number: 'asc' },
      select: { id: true, ayah_number: true },
    }),
    prisma.userProgress.findMany({
      where: { user_id: userId, ayah: { surah_id: surahId } },
      select: { ayah_id: true, stage: true, is_completed: true, completed_at: true },
    }),
  ])

  // Map progress ke tiap ayat
  const progressMap = {}
  progressList.forEach((p) => {
    if (!progressMap[p.ayah_id]) progressMap[p.ayah_id] = {}
    progressMap[p.ayah_id][p.stage] = { is_completed: p.is_completed, completed_at: p.completed_at }
  })

  const emptyStage = { is_completed: false, completed_at: null }
  const ayahsWithProgress = ayahs.map((ayah) => {
    const stages = {
      listening: progressMap[ayah.id]?.listening ?? emptyStage,
      reading:   progressMap[ayah.id]?.reading   ?? emptyStage,
      quiz:      progressMap[ayah.id]?.quiz       ?? emptyStage,
    }
    return {
      ayah_id: ayah.id,
      ayah_number: ayah.ayah_number,
      stages,
      is_fully_completed:
        stages.listening.is_completed &&
        stages.reading.is_completed &&
        stages.quiz.is_completed,
    }
  })

  const completedAyahCount = ayahsWithProgress.filter((a) => a.is_fully_completed).length

  return {
    surah,
    completion_percentage: Math.round((completedAyahCount / surah.total_ayah) * 100),
    completed_ayah: completedAyahCount,
    total_ayah: surah.total_ayah,
    ayahs: ayahsWithProgress,
  }
}

module.exports = { getProgress, getHistory, updateProgress, getProgressBySurah }
