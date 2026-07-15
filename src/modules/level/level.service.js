const { prisma } = require('../../config/database')

// ─────────────────────────────────────────
// Definisi 15 Tingkatan (1 level = 2 juz)
// ─────────────────────────────────────────
// rank_title — tema leaderboard yang disepakati tim: level 1 = Bumi,
// lalu naik lewat 7 lapis bumi, dan 7 level teratas adalah 7 lapis langit.
const LEVEL_DEFINITIONS = [
  { level: 1,  name: 'Level 1',  juz_required: 2,  rank_title: 'Bumi' },
  { level: 2,  name: 'Level 2',  juz_required: 4,  rank_title: 'Bumi Lapis 1' },
  { level: 3,  name: 'Level 3',  juz_required: 6,  rank_title: 'Bumi Lapis 2' },
  { level: 4,  name: 'Level 4',  juz_required: 8,  rank_title: 'Bumi Lapis 3' },
  { level: 5,  name: 'Level 5',  juz_required: 10, rank_title: 'Bumi Lapis 4' },
  { level: 6,  name: 'Level 6',  juz_required: 12, rank_title: 'Bumi Lapis 5' },
  { level: 7,  name: 'Level 7',  juz_required: 14, rank_title: 'Bumi Lapis 6' },
  { level: 8,  name: 'Level 8',  juz_required: 16, rank_title: 'Bumi Lapis 7' },
  { level: 9,  name: 'Level 9',  juz_required: 18, rank_title: 'Langit Lapis 1' },
  { level: 10, name: 'Level 10', juz_required: 20, rank_title: 'Langit Lapis 2' },
  { level: 11, name: 'Level 11', juz_required: 22, rank_title: 'Langit Lapis 3' },
  { level: 12, name: 'Level 12', juz_required: 24, rank_title: 'Langit Lapis 4' },
  { level: 13, name: 'Level 13', juz_required: 26, rank_title: 'Langit Lapis 5' },
  { level: 14, name: 'Level 14', juz_required: 28, rank_title: 'Langit Lapis 6' },
  { level: 15, name: 'Level 15', juz_required: 30, rank_title: 'Langit Lapis 7' },
]
const MAX_LEVEL = 15

// Hitung berapa juz yang sudah selesai semua ayatnya (stage quiz semua selesai)
const countCompletedJuz = async (userId) => {
  const completedJuzList = []
  for (let juz = 1; juz <= 30; juz++) {
    const [totalAyah, completedQuiz] = await Promise.all([
      prisma.ayah.count({ where: { juz_number: juz } }),
      prisma.userProgress.count({
        where: { user_id: userId, stage: 'quiz', is_completed: true, ayah: { juz_number: juz } },
      }),
    ])
    if (totalAyah > 0 && completedQuiz >= totalAyah) {
      completedJuzList.push(juz)
    }
  }
  return completedJuzList
}

// Hitung level dari jumlah juz selesai
const calculateLevel = (completedJuzCount) => {
  let currentLevel = 1
  for (const def of LEVEL_DEFINITIONS) {
    if (completedJuzCount >= def.juz_required) currentLevel = def.level
    else break
  }
  return currentLevel
}

// Level saat ini + progress ke level berikutnya
const getMyLevel = async (userId) => {
  const completedJuzList = await countCompletedJuz(userId)
  const completedJuzCount = completedJuzList.length
  const currentLevel = calculateLevel(completedJuzCount)
  const currentDef = LEVEL_DEFINITIONS[currentLevel - 1]
  const nextDef = currentLevel < MAX_LEVEL ? LEVEL_DEFINITIONS[currentLevel] : null

  // Update leaderboard snapshot
  await prisma.leaderboardSnapshot.upsert({
    where: { user_id: userId },
    update: { total_juz_completed: completedJuzCount, current_level: currentLevel, updated_at: new Date() },
    create: { user_id: userId, total_juz_completed: completedJuzCount, current_level: currentLevel },
  })

  return {
    current_level: currentLevel,
    level_name: currentDef.name,
    completed_juz: completedJuzCount,
    completed_juz_list: completedJuzList,
    next_level: nextDef
      ? {
          level: nextDef.level,
          name: nextDef.name,
          juz_required: nextDef.juz_required,
          juz_remaining: nextDef.juz_required - completedJuzCount,
        }
      : null,
    is_max_level: currentLevel === MAX_LEVEL,
  }
}

// Riwayat naik level
const getLevelHistory = async (userId) => {
  const history = await prisma.userLevel.findMany({
    where: { user_id: userId },
    orderBy: { achieved_at: 'asc' },
    select: { id: true, level: true, achieved_at: true },
  })
  return history.map((h) => ({
    ...h,
    level_name: LEVEL_DEFINITIONS[h.level - 1]?.name ?? `Level ${h.level}`,
  }))
}

// Info semua 15 level (tidak butuh DB)
const getAllLevelInfo = () => {
  return LEVEL_DEFINITIONS.map((def) => ({
    ...def,
    juz_range: `Juz ${def.juz_required - 1}–${def.juz_required}`,
  }))
}

// Leaderboard
const getLeaderboard = async (limit) => {
  const snapshots = await prisma.leaderboardSnapshot.findMany({
    orderBy: [{ current_level: 'desc' }, { total_juz_completed: 'desc' }],
    take: limit,
    include: {
      user: {
        select: {
          profile: { select: { display_name: true, avatar_url: true } },
        },
      },
    },
  })

  return snapshots.map((s, index) => ({
    rank: index + 1,
    username: s.user?.profile?.display_name ?? 'Pengguna',
    avatarUrl: s.user?.profile?.avatar_url ?? '',
    // Belum ada data negara user — dikirim kosong dulu sampai fitur pilih negara dibuat.
    countryFlag: '',
    rankTitle: LEVEL_DEFINITIONS[s.current_level - 1]?.rank_title ?? `Level ${s.current_level}`,
    // Formula xp yang disepakati: 1 juz selesai = 100 xp
    xp: s.total_juz_completed * 100,
  }))
}

// Dipanggil dari progress.service saat surah selesai
const checkAndUpdateLevel = async (userId) => {
  const completedJuzList = await countCompletedJuz(userId)
  const completedJuzCount = completedJuzList.length
  const newLevel = calculateLevel(completedJuzCount)

  const profile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
    select: { current_level: true },
  })
  const oldLevel = profile?.current_level ?? 1

  if (newLevel > oldLevel) {
    await Promise.all([
      prisma.userProfile.update({
        where: { user_id: userId },
        data: { current_level: newLevel },
      }),
      prisma.userLevel.create({
        data: { user_id: userId, level: newLevel },
      }),
      prisma.leaderboardSnapshot.upsert({
        where: { user_id: userId },
        update: { current_level: newLevel, total_juz_completed: completedJuzCount },
        create: { user_id: userId, current_level: newLevel, total_juz_completed: completedJuzCount },
      }),
    ])
    return { leveled_up: true, old_level: oldLevel, new_level: newLevel }
  }

  return { leveled_up: false, current_level: oldLevel }
}

module.exports = { getMyLevel, getLevelHistory, getAllLevelInfo, getLeaderboard, checkAndUpdateLevel }