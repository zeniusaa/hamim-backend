const bcrypt = require('bcryptjs')
const prisma = require('../../config/database')
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt')

// SERVICE = tempat business logic.
// Controller hanya terima request dan kirim response.
// Semua proses data (DB, hash, token) ada di service.
// Ini membuat kode lebih rapi dan mudah di-test.

const register = async ({ email, password }) => {
  // Cek apakah email sudah terdaftar
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const err = new Error('Email sudah terdaftar.')
    err.statusCode = 409
    throw err
  }

  // Hash password — JANGAN pernah simpan password plaintext ke DB
  // Salt rounds 10 = keseimbangan antara keamanan dan kecepatan
  const password_hash = await bcrypt.hash(password, 10)

  // Buat user + profile sekaligus dalam satu transaksi Prisma
  const user = await prisma.user.create({
    data: {
      email,
      password_hash,
      profile: {
        create: {}, // profile kosong dulu, diisi saat onboarding
      },
    },
    select: {
      id: true,
      email: true,
      is_onboarded: true,
      created_at: true,
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

module.exports = { register, login, refresh }
