const { prisma } = require('../../config/database')

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

const getMyProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone_number: true,
      is_onboarded: true,
      language: { select: { code: true, name: true } },
      profile: true,
    },
  })
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
