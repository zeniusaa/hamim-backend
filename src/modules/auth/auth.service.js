const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const prisma = require('../../config/database')
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt')
const { verifyGoogleIdToken } = require('../../utils/googleAuth')
const { sendResetPasswordEmail } = require('../../utils/email')

// Token reset password berlaku 1 jam
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

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

// POST /auth/forgot-password
// Selalu balas sukses walau email tidak ditemukan — jangan bocorkan
// apakah sebuah email terdaftar atau tidak (mencegah user enumeration).
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } })

  // User daftar via Google tanpa password_hash tidak bisa reset password biasa
  if (!user || !user.password_hash) {
    return
  }

  // Token asli dikirim ke email user, tapi yang disimpan di DB
  // adalah HASH-nya saja (sama seperti password) — supaya kalau
  // DB bocor, token mentah tidak ikut bocor.
  const rawToken = crypto.randomBytes(32).toString('hex')
  const reset_token_hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const reset_token_expires = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { reset_token_hash, reset_token_expires },
  })

  const resetLink = `${process.env.RESET_PASSWORD_URL}?token=${rawToken}`
  await sendResetPasswordEmail({ to: user.email, resetLink })
}

// POST /auth/reset-password
const resetPassword = async ({ token, password }) => {
  const reset_token_hash = crypto.createHash('sha256').update(token).digest('hex')

  const user = await prisma.user.findFirst({
    where: {
      reset_token_hash,
      reset_token_expires: { gt: new Date() }, // belum kadaluarsa
    },
  })

  if (!user) {
    const err = new Error('Token reset password tidak valid atau sudah kadaluarsa.')
    err.statusCode = 400
    throw err
  }

  const password_hash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash,
      reset_token_hash: null,
      reset_token_expires: null,
    },
  })
}

// DELETE /auth/account
// Kalau user punya password (daftar via email), wajib konfirmasi password
// dulu sebelum akun dihapus. User yang daftar via Google (tanpa password)
// cukup terautentikasi lewat token JWT.
// Semua data turunan (profile, progress, quiz_attempts, dll) otomatis
// ikut terhapus karena relasinya sudah onDelete: Cascade di schema.
const deleteAccount = async (userId, password) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    const err = new Error('User tidak ditemukan.')
    err.statusCode = 404
    throw err
  }

  if (user.password_hash) {
    if (!password) {
      const err = new Error('Password wajib diisi untuk menghapus akun.')
      err.statusCode = 400
      throw err
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      const err = new Error('Password salah.')
      err.statusCode = 401
      throw err
    }
  }

  await prisma.user.delete({ where: { id: userId } })
}

module.exports = {
  register,
  login,
  refresh,
  findOrCreateGoogleUser,
  loginWithGoogleIdToken,
  forgotPassword,
  resetPassword,
  deleteAccount,
}