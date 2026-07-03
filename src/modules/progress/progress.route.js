const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const progressController = require('./progress.controller')

// GET  /progress                — semua progress user, dikelompokkan per surat
// GET  /progress/history        — log riwayat aktivitas game (pagination)
// POST /progress                — update stage selesai
// GET  /progress/surah/:surahId — progress detail 1 surat (per ayat, per stage)
router.get('/', authMiddleware, progressController.getProgress)
router.get('/history', authMiddleware, progressController.getHistory)
router.post('/', authMiddleware, progressController.updateProgress)
router.get('/surah/:surahId', authMiddleware, progressController.getProgressBySurah)

module.exports = router
