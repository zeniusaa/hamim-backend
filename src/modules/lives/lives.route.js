const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const livesController = require('./lives.controller')

// GET  /lives           — status nyawa saat ini (auto-regen dihitung di sini)
// POST /lives/watch-ad  — tambah 1 nyawa instan setelah user selesai nonton iklan
router.get('/', authMiddleware, livesController.getStatus)
router.post('/watch-ad', authMiddleware, livesController.watchAd)

module.exports = router
