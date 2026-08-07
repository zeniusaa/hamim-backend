const express = require('express')
const rateLimit = require('express-rate-limit')
const controller = require('./admin.controller')
const adminOnly = require('../../middlewares/admin')

const router = express.Router()

// Rate limiter khusus login admin — LEBIH KETAT dari auth user (5 vs 10
// percobaan per 15 menit), karena ini pintu masuk ke data sensitif.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login admin. Coba lagi dalam 15 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Public ─────────────────────────────────────────────────
// POST /admin/login — login dashboard admin (web only, bukan app mobile)
router.post('/login', adminLoginLimiter, controller.login)

// ─── Protected — SEMUA route di bawah sini wajib token admin ─
// adminOnly = verifikasi JWT + cek role ADMIN. Ditaruh sekali di sini
// supaya route baru yang ditambah di Fase 1/2 otomatis aman.
router.use(adminOnly)

// GET /admin/me — cek token masih valid + data admin
router.get('/me', controller.me)

// ─── Fase 1: Manajemen User ─────────────────────────
// GET /admin/users — list + search + filter + pagination
router.get('/users', controller.listUsers)

// GET /admin/users/:id — detail lengkap (profil, lives, statistik)
router.get('/users/:id', controller.getUser)

// PATCH /admin/users/:id/premium — kasih/tarik premium (body: {is_premium, duration_days?})
router.patch('/users/:id/premium', controller.setPremium)

// PATCH /admin/users/:id/lives — reset nyawa (body: {current_lives?})
router.patch('/users/:id/lives', controller.resetLives)

// POST /admin/users/:id/reset-progress — reset total progres belajar
router.post('/users/:id/reset-progress', controller.resetProgress)

// DELETE /admin/users/:id — nonaktifkan (soft delete)
router.delete('/users/:id', controller.softDeleteUser)

// POST /admin/users/:id/restore — batalkan soft delete
router.post('/users/:id/restore', controller.restoreUser)

// ─── Fase 2: Manajemen Konten ─────────────────────
// Surah
router.get('/surahs', controller.listSurahs)
router.get('/surahs/:id', controller.getSurah)
router.post('/surahs', controller.createSurah)
router.patch('/surahs/:id', controller.updateSurah)
router.delete('/surahs/:id', controller.deleteSurah)

// Ayah (nested di surah + by id)
router.get('/surahs/:id/ayahs', controller.listAyahs)
router.post('/surahs/:id/ayahs', controller.createAyah)
router.get('/ayahs/:id', controller.getAyah)
router.patch('/ayahs/:id', controller.updateAyah)
router.delete('/ayahs/:id', controller.deleteAyah)

// Quiz question
router.get('/ayahs/:id/questions', controller.listQuestions)
router.post('/ayahs/:id/questions', controller.createQuestion)
router.patch('/questions/:id', controller.updateQuestion)
router.delete('/questions/:id', controller.deleteQuestion)

// Assets
router.get('/assets', controller.listAssets)
router.post('/assets/bundles/:id/bump-version', controller.bumpBundleVersion)

// ─── Fase 3: Analytics ─────────────────────────
router.get('/analytics/overview', controller.analyticsOverview)
router.get('/analytics/leaderboard', controller.analyticsLeaderboard)
router.get('/analytics/quiz-activity', controller.analyticsQuizActivity)
router.get('/analytics/user-growth', controller.analyticsUserGrowth)

module.exports = router
