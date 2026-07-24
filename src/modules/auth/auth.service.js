const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const prisma = require('../../config/database')
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt')
const { verifyGoogleIdToken } = require('../../utils/googleAuth')
const { sendResetPasswordEmail, sendVerificationEmail } = require('../../utils/email')

// Token reset password berlaku 1 jam
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

// Token verifikasi email berlaku lebih lama dari reset password (24 jam),
// karena user mungkin tidak langsung buka emailnya setelah daftar.
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Helper dipakai bareng oleh register() dan resendVerificationEmail() —
// generate token verifikasi baru, simpan HASH-nya ke DB, lalu kirim emailnya.
// Sama seperti reset password: token asli hanya ada di email, DB cuma simpan hash.
const generateAndSendVerification = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const verification_token_hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const verification_token_expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { verification_token_hash, verification_token_expires },
  })

  const verifyLink = `${process.env.BACKEND_URL}/auth/verify-email?token=${rawToken}`
  await sendVerificationEmail({ to: user.email, verifyLink })
}

// SERVICE = tempat business logic.
// Controller hanya terima request dan kirim response.
// Semua proses data (DB, hash, token) ada di service.
// Ini membuat kode lebih rapi dan mudah di-test.

const register = async ({ name, email, phone_number, password, language_code }) => {
  // Cek apakah email sudah terdaftar
  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    const message = existingEmail.deleted_at
      ? 'Email ini terhubung dengan akun yang sedang dalam proses penghapusan. Silakan login untuk memulihkan akun tersebut.'
      : 'Email sudah terdaftar.'
    const err = new Error(message)
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

  // Kirim email verifikasi di background — tidak perlu ditunggu (await)
  // supaya proses register tidak lambat kalau SMTP-nya lemot.
  // Kalau gagal kirim, tidak menggagalkan register — user masih bisa
  // minta kirim ulang lewat endpoint resend-verification.
  generateAndSendVerification(user).catch((err) => {
    console.error('Gagal kirim email verifikasi:', err.message)
  })

  return { user, ...tokens }
}

const login = async ({ email, password }) => {
  // Cari user berdasarkan email (termasuk yang deleted_at-nya terisi,
  // supaya kita bisa deteksi & auto-restore kalau dia login lagi)
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

  // Akun sedang dalam masa tunggu hapus (< 30 hari) -> login lagi = batal hapus otomatis
  const accountRestored = !!user.deleted_at
  if (accountRestored) {
    await prisma.user.update({ where: { id: user.id }, data: { deleted_at: null } })
  }

  const tokens = generateTokens({ id: user.id, email: user.email })

  return {
    user: {
      id: user.id,
      email: user.email,
      is_onboarded: user.is_onboarded,
    },
    account_restored: accountRestored,
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

  // Akun sedang dalam masa tunggu hapus — jangan perpanjang sesi lewat refresh token.
  // User harus login ulang (email/password atau Google) supaya akunnya di-restore dulu.
  if (user.deleted_at) {
    const err = new Error('Akun sedang dalam proses penghapusan. Silakan login ulang untuk memulihkan akun.')
    err.statusCode = 403
    throw err
  }

  const tokens = generateTokens({ id: user.id, email: user.email })
  return tokens
}

// Dipakai bareng oleh flow web (passport, browser) dan flow native (Flutter).
// Supaya logic "cari atau buat user dari data Google" tidak duplikat di 2 tempat.
// Sekalian handle auto-restore: kalau user ini sedang dalam masa tunggu hapus akun
// (deleted_at terisi) dan berhasil login lagi, penghapusannya otomatis dibatalkan.
const findOrCreateGoogleUser = async ({ googleId, email, displayName, avatarUrl }) => {
  // Sudah pernah login Google sebelumnya?
  let user = await prisma.user.findUnique({ where: { google_id: googleId } })

  // Email sudah ada (misal daftar manual pakai email/password)? Tautkan google_id-nya.
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      user = await prisma.user.update({ where: { email }, data: { google_id: googleId } })
    }
  }

  // Belum ada sama sekali → buat akun baru
  if (!user) {
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

  if (user.deleted_at) {
    user = await prisma.user.update({ where: { id: user.id }, data: { deleted_at: null } })
    user.was_restored = true // flag sementara (bukan kolom DB), dibaca oleh caller
  }

  return user
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
    account_restored: !!user.was_restored,
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

// GET /auth/verify-email?token=xxxx
// Dipanggil saat user klik link di email. Beda dari reset-password,
// endpoint ini langsung menandai user terverifikasi (tidak perlu form lanjutan).
const verifyEmail = async (token) => {
  const verification_token_hash = crypto.createHash('sha256').update(token).digest('hex')

  const user = await prisma.user.findFirst({
    where: {
      verification_token_hash,
      verification_token_expires: { gt: new Date() }, // belum kadaluarsa
    },
  })

  if (!user) {
    const err = new Error('Token verifikasi tidak valid atau sudah kadaluarsa.')
    err.statusCode = 400
    throw err
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verified: true,
      verification_token_hash: null,
      verification_token_expires: null,
    },
  })
}

// POST /auth/resend-verification
// Selalu balas sukses walau email tidak ditemukan/sudah terverifikasi —
// sama seperti forgotPassword, ini untuk mencegah user enumeration.
const resendVerificationEmail = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.email_verified) {
    return
  }

  await generateAndSendVerification(user)
}

// DELETE /auth/account
// Kalau user punya password (daftar via email), wajib konfirmasi password
// dulu sebelum akun ditandai hapus. User yang daftar via Google (tanpa password)
// cukup terautentikasi lewat token JWT.
//
// SOFT DELETE: akun tidak langsung dihapus dari DB, cuma ditandai `deleted_at`.
// Selama 30 hari, kalau user ini login lagi (email/password atau Google),
// penghapusannya otomatis dibatalkan (lihat login() & findOrCreateGoogleUser()).
// Setelah 30 hari tanpa login, baru dihapus PERMANEN oleh scheduler
// (src/utils/cleanupDeletedUsers.js, dijalankan otomatis dari app.js tiap hari).
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

  await prisma.user.update({ where: { id: userId }, data: { deleted_at: new Date() } })
}

module.exports = {
  register,
  login,
  refresh,
  findOrCreateGoogleUser,
  loginWithGoogleIdToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  deleteAccount,
}