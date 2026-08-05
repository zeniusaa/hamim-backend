const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const quizController = require('./quiz.controller')

// GET  /quiz/ayah/:ayahId    — daftar soal kuis untuk 1 ayat
// GET  /quiz/package         — package soal untuk 1 kelompok ayat sekaligus (?ayah_ids=1,2,3)
// POST /quiz/attempt         — submit 1 jawaban soal (tidak memotong nyawa)
// POST /quiz/group-attempt   — submit semua jawaban 1 kelompok ayat sekaligus (nyawa dipotong 1x di sini)
// GET  /quiz/history         — riwayat kuis user
router.get('/ayah/:ayahId', authMiddleware, quizController.getQuestionsByAyah)
router.get('/package', authMiddleware, quizController.getQuestionPackage)
router.post('/attempt', authMiddleware, quizController.submitAttempt)
router.post('/group-attempt', authMiddleware, quizController.submitGroupAttempt)
router.get('/history', authMiddleware, quizController.getUserHistory)

module.exports = router
