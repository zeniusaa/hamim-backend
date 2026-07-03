const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const levelController = require('./level.controller')

// GET /level/me          — level saat ini + progress ke level berikutnya
// GET /level/history     — riwayat naik level
// GET /level/info        — info semua 15 tingkatan (public, tanpa auth)
// GET /level/leaderboard — ranking user ?limit=50
router.get('/me', authMiddleware, levelController.getMyLevel)
router.get('/history', authMiddleware, levelController.getLevelHistory)
router.get('/info', levelController.getLevelInfo)
router.get('/leaderboard', authMiddleware, levelController.getLeaderboard)

module.exports = router
