const { prisma } = require('../../config/database')
const livesService = require('../lives/lives.service')

// Dipanggil sekali setelah user selesai isi form onboarding
// (avatar, mulai dari juz mana, kenapa hafalan, target harian, dst).
// phone_number bersifat opsional di sini — dipakai khusus untuk user yang
// daftar via Google (yang belum sempat isi nomor HP saat register).
const completeOnboarding = async (userId, data) => {
  const { phone_number, ...profileData } = data

  if (phone_number) {
    // Pastikan nomor belum dipakai akun lain
    const existing = await prisma.user.findFirst({
      where: { phone_number, NOT: { id: userId } },
    })
    if (existing) {
      const err = new Error('Nomor HP/WA sudah dipakai akun lain.')
      err.statusCode = 409
      throw err
    }
    await prisma.user.update({ where: { id: userId }, data: { phone_number } })
  }

  const profile = await prisma.userProfile.update({
    where: { user_id: userId },
    data: profileData,
  })

  // Tandai onboarding selesai — client pakai flag ini untuk tahu
  // apakah user perlu diarahkan ke form onboarding atau langsung ke home
  await prisma.user.update({ where: { id: userId }, data: { is_onboarded: true } })

  return profile
}

// GET /profile/me
// Digabung dari beberapa sumber:
//   - Data akun & profil dasar (User + UserProfile)
//   - Status nyawa/premium REAL-TIME (bukan baca mentah dari tabel — dihitung
//     ulang lewat livesService.getStatus supaya regen otomatis ikut ter-apply,
//     sama seperti kalau user buka GET /lives)
//   - Ringkasan level & posisi leaderboard (dari snapshot yang sudah ada,
//     TIDAK dihitung ulang dari nol karena itu proses berat/30 query —
//     kalau butuh angka yang paling akurat & real-time, pakai GET /level/me)
const getMyProfile = async (userId) => {
  const [user, lives] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone_number: true,
        phone_verified: true,
        email_verified: true,
        is_onboarded: true,
        google_id: true,
        created_at: true,
        language: { select: { id: true, code: true, name: true } },
        profile: true,
        leaderboard_snapshot: {
          select: { total_juz_completed: true, current_level: true, updated_at: true },
        },
      },
    }),
    livesService.getStatus(userId),
  ])

  if (!user) return null

  const { google_id, leaderboard_snapshot, ...rest } = user

  // Posisi rank di leaderboard — dihitung ringan (1 query count), bukan
  // dari looping semua leaderboard seperti GET /level/leaderboard.
  let rank = null
  if (leaderboard_snapshot) {
    const higherRankedCount = await prisma.leaderboardSnapshot.count({
      where: {
        OR: [
          { current_level: { gt: leaderboard_snapshot.current_level } },
          {
            current_level: leaderboard_snapshot.current_level,
            total_juz_completed: { gt: leaderboard_snapshot.total_juz_completed },
          },
        ],
      },
    })
    rank = higherRankedCount + 1
  }

  return {
    ...rest,
    google_linked: !!google_id,
    lives,
    leaderboard: leaderboard_snapshot ? { ...leaderboard_snapshot, rank } : null,
  }
}

// PATCH /profile — update field profil sewaktu-waktu (avatar, nama, target harian, dst).
// Bedanya dari completeOnboarding: ini bisa dipanggil berkali-kali, kapan saja,
// dan cuma update field yang benar-benar dikirim (partial update).
const updateProfile = async (userId, data) => {
  return prisma.userProfile.update({
    where: { user_id: userId },
    data,
  })
}

module.exports = { completeOnboarding, updateProfile, getMyProfile }
