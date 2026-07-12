const bcrypt = require('bcryptjs')
const prisma = require('../../config/database')
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt')
const { verifyGoogleIdToken } = require('../../utils/googleAuth')

// SERVICE = tempat business logic.
// Controller hanya terima request dan kirim response.
// Semua proses data (DB, hash, token) ada di service.
// Ini membuat kode lebih rapi dan mudah di-test.

const register = async ({ name, email, phone_number, password, language_code }) => {
  // Cek apakah email sudah terdaftar
  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    const err = new Error('Email sudah terdaftar.')
    err.statusCode = 409
    throw err
  }

  // Cek apakah nomor HP/WA sudah dipakai akun lain
  const existingPhone = await prisma.user.findUnique({ where: { phone_number } })
  if (existingPhone) {
    const err = new Error('Nomor HP/WA sudah terdaftar.')
    err.statusCode = 409
    throw err
  }

  // language_code opsional — dikirim dari layar "pilih bahasa" sebelum daftar.
  // Kalau tidak dikirim atau kodenya tidak dikenal, language_id dibiarkan null.
  let language_id = null
  if (language_code) {
    const language = await prisma.language.findUnique({ where: { code: language_code } })
    language_id = language?.id ?? null
  }

  // Hash password — JANGAN pernah simpan password plaintext ke DB
  // Salt rounds 10 = keseimbangan antara keamanan dan kecepatan
  const password_hash = await bcrypt.hash(password, 10)

  // Buat user + profile sekaligus dalam satu transaksi Prisma.
  // display_name langsung diisi dari nama yang diinput saat daftar;
  // field onboarding lain (avatar, learning_start, dst) diisi belakangan
  // lewat endpoint PATCH /profile/onboarding.
  const user = await prisma.user.create({
    data: {
      email,
      phone_number,
      password_hash,
      language_id,
      profile: {
        create: { display_name: name },
      },
    },
    select: {
      id: true,
      email: true,
      phone_number: true,
      is_onboarded: true,
      created_at: true,
      profile: { select: { display_name: true } },
    },
  })

  const tokens = generateTokens({ id: user.id, email: user.email })

  return { user, ...tokens }
}

const login = async ({ email, password }) => {
  // Cari user berdasarkan email
  const user = await prisma.user.findUnique({ where: { email } })

  // Pesan error sengaja dibuat generik — jangan beritahu apakah
  // email tidak ada atau password salah (security best practice)
  if (!user || !user.password_hash) {
    const err = new Error('Email atau password salah.')
    err.statusCode = 401
    throw err
  }

  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) {
    const err = new Error('Email atau password salah.')
    err.statusCode = 401
    throw err
  }

  const tokens = generateTokens({ id: user.id, email: user.email })

  return {
    user: {
      id: user.id,
      email: user.email,
      is_onboarded: user.is_onboarded,
    },
    ...tokens,
  }
}

const refresh = async (refreshToken) => {
  if (!refreshToken) {
    const err = new Error('Refresh token tidak ditemukan.')
    err.statusCode = 401
    throw err
  }

  let decoded
  try {
    decoded = verifyRefreshToken(refreshToken)
  } catch {
    const err = new Error('Refresh token tidak valid atau sudah expired.')
    err.statusCode = 401
    throw err
  }

  // Pastikan user masih ada di DB (misal, akun dihapus setelah token dibuat)
  const user = await prisma.user.findUnique({ where: { id: decoded.id } })
  if (!user) {
    const err = new Error('User tidak ditemukan.')
    err.statusCode = 401
    throw err
  }

  const tokens = generateTokens({ id: user.id, email: user.email })
  return tokens
}

// Dipakai bareng oleh flow web (passport, browser) dan flow native (Flutter).
// Supaya logic "cari atau buat user dari data Google" tidak duplikat di 2 tempat.
const findOrCreateGoogleUser = async ({ googleId, email, displayName, avatarUrl }) => {
  // Sudah pernah login Google sebelumnya?
  let user = await prisma.user.findUnique({ where: { google_id: googleId } })
  if (user) return user

  // Email sudah ada (misal daftar manual pakai email/password)? Tautkan google_id-nya.
  user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    return prisma.user.update({
      where: { email },
      data: { google_id: googleId },
    })
  }

  // Belum ada sama sekali → buat akun baru
  return prisma.user.create({
    data: {
      email,
      google_id: googleId,
      profile: {
        create: {
          display_name: displayName,
          avatar_url: avatarUrl ?? null,
        },
      },
    },
  })
}

// POST /auth/google/native — dipanggil dari Flutter setelah dapat idToken
// dari Google Sign-In SDK native (bukan lewat browser/redirect).
const loginWithGoogleIdToken = async (idToken) => {
  const payload = await verifyGoogleIdToken(idToken)
  const user = await findOrCreateGoogleUser(payload)
  const tokens = generateTokens({ id: user.id, email: user.email })

  return {
    user: {
      id: user.id,
      email: user.email,
      is_onboarded: user.is_onboarded,
    },
    ...tokens,
  }
}

module.exports = {
  register,
  login,
  refresh,
  findOrCreateGoogleUser,
  loginWithGoogleIdToken,
}