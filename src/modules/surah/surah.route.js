const express = require('express')
const authMiddleware = require('../../middlewares/auth')
const controller = require('./surah.controller')

const router = express.Router()

// GET /surah          — semua surat (114)
// GET /surah?juz=5     — cuma surat yang punya ayah di juz 5
router.get('/', authMiddleware, controller.list)

// GET /surah/:id/ayahs — semua ayat 1 surat, teks Arab saja
router.get('/:id/ayahs', authMiddleware, controller.listArabicAyahs)

module.exports = router
