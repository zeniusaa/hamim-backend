const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const audioController = require('./audio.controller')

// GET /audio/surah/:surahId  — semua audio ayat dalam 1 surat (untuk pre-load sebelum game)
// GET /audio/ayah/:ayahId    — audio 1 ayat spesifik
router.get('/surah/:surahId', authMiddleware, audioController.getAudioBySurah)
router.get('/ayah/:ayahId', authMiddleware, audioController.getAudioByAyah)

module.exports = router
