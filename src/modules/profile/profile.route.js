const express = require('express')
const controller = require('./profile.controller')
const authMiddleware = require('../../middlewares/auth')
const { uploadAvatar } = require('../../middlewares/upload')

const router = express.Router()

// Semua endpoint profile butuh login (JWT access token)
router.use(authMiddleware)

// PATCH /profile/onboarding — dipanggil sekali setelah register/login pertama kali
router.patch('/onboarding', controller.completeOnboarding)

// PATCH /profile — ubah profil sewaktu-waktu setelah onboarding (nama, target, dll — TANPA file)
router.patch('/', controller.updateProfile)

// POST /profile/avatar — upload file foto profil (multipart/form-data, field "avatar")
// Beda dari PATCH /profile: field avatar_url di situ cuma nerima STRING URL,
// endpoint ini yang benar-benar terima file gambarnya dan simpan ke server.
router.post('/avatar', uploadAvatar, controller.uploadAvatar)

// GET /profile/me — ambil profil lengkap (buat layar profil di app)
router.get('/me', controller.me)

module.exports = router
