const express = require('express')
const authMiddleware = require('../../middlewares/auth')
const controller = require('./surah.controller')

const router = express.Router()

// GET /surah          — semua surat (114)
// GET /surah?juz=5     — cuma surat yang punya ayah di juz 5
router.get('/', authMiddleware, controller.list)

module.exports = router
