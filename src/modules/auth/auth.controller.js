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

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token tidak valid.'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter.')
    .max(100, 'Password terlalu panjang.'),
})

const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Token tidak valid.'),
})

const resendVerificationSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
})

const deleteAccountSchema = z.object({
  // Opsional di level validasi — wajib-tidaknya dicek di service,
  // karena tergantung apakah user daftar via email atau Google.
  password: z.string().optional(),
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
        email_verified: true,
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

// POST /auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body)
    await authService.forgotPassword(data.email)

    // Pesan generik — tidak membedakan email terdaftar atau tidak
    return success(res, 'Jika email terdaftar, link reset password sudah dikirim.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body)
    await authService.resetPassword(data)

    return success(res, 'Password berhasil direset. Silakan login dengan password baru.')
  } catch (err) {
    next(err)
  }
}

// GET /auth/verify-email?token=xxxx
// Diakses langsung dari link di email (bukan dipanggil dari app),
// jadi token diambil dari query string, bukan body.
const verifyEmail = async (req, res, next) => {
  try {
    const data = verifyEmailSchema.parse(req.query)
    await authService.verifyEmail(data.token)

    return success(res, 'Email berhasil diverifikasi. Silakan kembali ke aplikasi.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const data = resendVerificationSchema.parse(req.body)
    await authService.resendVerificationEmail(data.email)

    // Pesan generik — tidak membedakan email terdaftar/sudah terverifikasi atau tidak
    return success(res, 'Jika email terdaftar dan belum terverifikasi, link verifikasi sudah dikirim.')
  } catch (err) {
    next(err)
  }
}

// DELETE /auth/account
const deleteAccount = async (req, res, next) => {
  try {
    const data = deleteAccountSchema.parse(req.body)
    await authService.deleteAccount(req.user.id, data.password)

    return success(res, 'Akun berhasil dihapus.')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  register,
  login,
  refresh,
  googleCallback,
  googleNative,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteAccount,
}