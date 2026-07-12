const { z } = require('zod')
const authService = require('./auth.service')
const { generateTokens } = require('../../utils/jwt')
const { success, error } = require('../../utils/response')

// CONTROLLER = jembatan antara HTTP request dan service.
// Tugasnya: validasi input, panggil service, kirim response.
// Jangan taruh logika bisnis di sini.

// Schema validasi dengan Zod
// Zod akan otomatis throw error jika input tidak sesuai
const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter.').max(100, 'Nama terlalu panjang.'),
  email: z.string().email('Format email tidak valid.'),
  phone_number: z
    .string()
    .min(8, 'Nomor HP/WA tidak valid.')
    .max(20, 'Nomor HP/WA terlalu panjang.'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter.')
    .max(100, 'Password terlalu panjang.'),
  // Dikirim dari layar "pilih bahasa" — opsional, contoh: "id" atau "en"
  language_code: z.string().min(2).max(5).optional(),
})

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Password tidak boleh kosong.'),
})

// Body dari Flutter: cuma idToken hasil google_sign_in SDK
const googleNativeSchema = z.object({
  idToken: z.string().min(10, 'idToken tidak boleh kosong.'),
})

// POST /auth/register
const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body)
    const result = await authService.register(data)

    return success(res, 'Registrasi berhasil.', result, 201)
  } catch (err) {
    next(err) // diteruskan ke errorHandler middleware
  }
}

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data)

    return success(res, 'Login berhasil.', result)
  } catch (err) {
    next(err)
  }
}

// POST /auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    const tokens = await authService.refresh(refreshToken)

    return success(res, 'Token diperbarui.', tokens)
  } catch (err) {
    next(err)
  }
}

// GET /auth/google/callback
// Dipanggil setelah Google redirect balik ke app kita (flow WEB via browser).
// Passport sudah proses user-nya, kita tinggal buat token.
const googleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return error(res, 'Login Google gagal.', 401)
    }

    const tokens = generateTokens({ id: req.user.id, email: req.user.email })

    // Untuk mobile app: redirect dengan token di query string
    // Tim mobile bisa tangkap ini via deep link
    // const redirectUrl = `hamim://auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`

    // GANTI SEMENTARA (untuk testing di browser/Postman)
    return res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    return res.redirect(redirectUrl)
  } catch (err) {
    next(err)
  }
}

// POST /auth/google/native
// Dipanggil dari Flutter (flow NATIVE, tanpa buka browser).
// Body: { idToken } hasil Google Sign-In SDK di sisi mobile.
const googleNative = async (req, res, next) => {
  try {
    const { idToken } = googleNativeSchema.parse(req.body)
    const result = await authService.loginWithGoogleIdToken(idToken)

    return success(res, 'Login Google berhasil.', result)
  } catch (err) {
    next(err)
  }
}

// GET /auth/me — cek siapa yang sedang login
const me = async (req, res, next) => {
  try {
    const prisma = require('../../config/database')
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone_number: true,
        is_onboarded: true,
        language_id: true,
        created_at: true,
        profile: {
          select: {
            display_name: true,
            avatar_url: true,
            learning_start: true,
            daily_target_minutes: true,
          },
        },
      },
    })

    if (!user) return error(res, 'User tidak ditemukan.', 404)

    return success(res, 'Data user berhasil diambil.', user)
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, refresh, googleCallback, googleNative, me }