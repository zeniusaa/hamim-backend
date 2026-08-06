const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const livesController = require('./lives.controller')

// GET  /lives           — status nyawa saat ini (auto-regen dihitung di sini)
// POST /lives/watch-ad  — tambah 1 nyawa instan setelah user selesai nonton iklan
router.get('/', authMiddleware, livesController.getStatus)

// Rate limit khusus watch-ad: maksimal 5 klaim iklan per 10 menit per USER
// (keyGenerator pakai user id, bukan IP — karena app mobile bisa satu IP
// rame-rame). Sebelumnya endpoint ini tanpa batas sama sekali: client bisa
// spam "udah nonton iklan" → lives unlimited. Catatan: ini mencegah spam
// cepat, tapi verifikasi iklan BENAR-BENAR (server-side, mis. AdMob SSV)
// tetap perlu ditambahkan sebelum produksi.
const adLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 5,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: {
    success: false,
    message: 'Terlalu banyak klaim iklan. Coba lagi nanti.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/watch-ad', authMiddleware, adLimiter, livesController.watchAd)

module.exports = router
