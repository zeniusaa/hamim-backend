const express = require('express')
const controller = require('./profile.controller')
const authMiddleware = require('../../middlewares/auth')

const router = express.Router()

// Semua endpoint profile butuh login (JWT access token)
router.use(authMiddleware)

// PATCH /profile/onboarding — dipanggil sekali setelah register/login pertama kali
router.patch('/onboarding', controller.completeOnboarding)

// PATCH /profile — ubah profil sewaktu-waktu setelah onboarding (avatar, nama, dll)
router.patch('/', controller.updateProfile)

// GET /profile/me — ambil profil lengkap (buat layar profil di app)
router.get('/me', controller.me)

module.exports = router
