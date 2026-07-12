const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const quizController = require('./quiz.controller')

// GET  /quiz/ayah/:ayahId   — daftar soal kuis untuk 1 ayat
// POST /quiz/attempt         — submit jawaban
// GET  /quiz/history          — riwayat kuis user
router.get('/ayah/:ayahId', authMiddleware, quizController.getQuestionsByAyah)
router.post('/attempt', authMiddleware, quizController.submitAttempt)
router.get('/history', authMiddleware, quizController.getUserHistory)

module.exports = router