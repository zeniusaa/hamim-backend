const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const audioController = require('./audio.controller')

// GET /audio/surah/:surahId               — semua audio ayat dalam 1 surat (untuk pre-load sebelum game)
// GET /audio/surah/:surahId/groups         — SEMUA kelompok ayat: audio + arabic + quiz langsung
// GET /audio/surah/:surahId/groups/:ayahNumber — CUMA 1 kelompok yang mencakup ayat ini (mis. ayat 1-4)
// GET /audio/ayah/:ayahId                  — audio 1 ayat spesifik
router.get('/surah/:surahId/groups/:ayahNumber', authMiddleware, audioController.getGroupByAyahNumber)
router.get('/surah/:surahId/groups', authMiddleware, audioController.getGroupsBySurah)
router.get('/surah/:surahId', authMiddleware, audioController.getAudioBySurah)
router.get('/ayah/:ayahId', authMiddleware, audioController.getAudioByAyah)

module.exports = router
