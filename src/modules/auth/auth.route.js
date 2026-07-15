const express = require('express')
const passport = require('passport')
const rateLimit = require('express-rate-limit')
const controller = require('./auth.controller')
const authMiddleware = require('../../middlewares/auth')

const router = express.Router()

// Rate limiter khusus untuk endpoint auth — mencegah brute force password.
// Maksimal 10 request dalam 15 menit per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Email / Password ────────────────────────────────────────
// POST /auth/register
router.post('/register', authLimiter, controller.register)

// POST /auth/login
router.post('/login', authLimiter, controller.login)

// POST /auth/refresh  — minta access token baru pakai refresh token
router.post('/refresh', controller.refresh)

// POST /auth/forgot-password — minta link reset password dikirim ke email
router.post('/forgot-password', authLimiter, controller.forgotPassword)

// POST /auth/reset-password — submit token + password baru
router.post('/reset-password', authLimiter, controller.resetPassword)

// GET /auth/verify-email — diklik dari link di email, bukan dipanggil dari app
router.get('/verify-email', controller.verifyEmail)

// POST /auth/resend-verification — kirim ulang link verifikasi
router.post('/resend-verification', authLimiter, controller.resendVerification)

// ─── Google OAuth (Web — browser redirect) ───────────────────
// GET /auth/google — redirect user ke halaman login Google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false, // kita pakai JWT, bukan session
  })
)

// GET /auth/google/callback — Google redirect ke sini setelah user login
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failed' }),
  controller.googleCallback
)

// GET /auth/google/failed
router.get('/google/failed', (req, res) => {
  res.status(401).json({ success: false, message: 'Login Google gagal.' })
})

// ─── Google OAuth (Native — Flutter, google_sign_in SDK) ─────
// POST /auth/google/native — Flutter kirim idToken hasil sign-in native
router.post('/google/native', authLimiter, controller.googleNative)

// ─── Protected ───────────────────────────────────────────────
// GET /auth/me — endpoint untuk cek token masih valid + ambil data user
router.get('/me', authMiddleware, controller.me)

// DELETE /auth/account — hapus akun permanen (butuh password kalau daftar via email)
router.delete('/account', authMiddleware, controller.deleteAccount)

module.exports = router