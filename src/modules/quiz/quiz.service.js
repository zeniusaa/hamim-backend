const { prisma } = require('../../config/database')
const livesService = require('../lives/lives.service')

// GET /quiz/ayah/:ayahId?language_code=id
// Ambil soal kuis (melengkapi ayat / drag and drop arabic) untuk 1 ayat tertentu.
const getQuestionsByAyah = async (ayahId, languageCode = 'id') => {
  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new Error('LANGUAGE_NOT_FOUND')

  const questions = await prisma.quizQuestion.findMany({
    where: { ayah_id: ayahId, language_id: language.id },
    select: {
      id: true,
      type: true,
      question_text: true,
      options: {
        select: { id: true, option_text: true, order_index: true },
        orderBy: { order_index: 'asc' },
      },
    },
  })

  return questions
}

// GET /quiz/package?ayah_ids=12,13,14&language_code=id
// "Package" soal untuk 1 kelompok ayat sekaligus (kelompok yang sama seperti yang dipakai
// di stage listening — ayah_ids[] yang dikirim frontend). Satu kali panggilan API
// mengembalikan semua soal (tipe drag_ayat) untuk seluruh ayat dalam kelompok itu.
// Sekalian disisipkan status nyawa user biar frontend langsung tahu boleh mulai kuis atau tidak.
// Catatan: untuk kombinasi audio + arabic + quiz sekaligus dalam 1x panggilan,
// pakai GET /audio/surah/:surahId/groups.
const getQuestionPackage = async (userId, ayahIds, languageCode = 'id') => {
  if (!Array.isArray(ayahIds) || ayahIds.length === 0) throw new Error('AYAH_IDS_REQUIRED')

  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new Error('LANGUAGE_NOT_FOUND')

  const [ayahs, livesStatus] = await Promise.all([
    prisma.ayah.findMany({
      where: { id: { in: ayahIds } },
      orderBy: { ayah_number: 'asc' },
      select: {
        id: true,
        ayah_number: true,
        surah_id: true,
        surah: { select: { id: true, number: true, name_transliteration: true } },
        quiz_questions: {
          where: { language_id: language.id },
          select: {
            id: true,
            type: true,
            question_text: true,
            options: {
              select: { id: true, option_text: true, order_index: true },
              orderBy: { order_index: 'asc' },
            },
          },
        },
      },
    }),
    livesService.getStatus(userId),
  ])

  return {
    surah: ayahs[0]?.surah ?? null,
    lives: livesStatus,
    ayahs: ayahs.map((a) => ({
      ayah_id: a.id,
      ayah_number: a.ayah_number,
      questions: a.quiz_questions,
    })),
  }
}

// Helper: bandingkan urutan option (potongan kata) yang disusun user dengan
// urutan yang benar (option.order_index). Dipakai untuk satu-satunya tipe
// kuis yang tersisa: drag_ayat (melengkapi ayat / drag and drop arabic).
const gradeDragAnswer = (question, submittedOrder) => {
  const correctOrder = [...question.options]
    .sort((a, b) => a.order_index - b.order_index)
    .map((o) => o.id)

  const isCorrect =
    Array.isArray(submittedOrder) &&
    submittedOrder.length === correctOrder.length &&
    submittedOrder.every((id, i) => id === correctOrder[i])

  return { isCorrect, correctOrder }
}

// Tandai first_session_completed (sekali set, false -> true, tidak pernah balik).
// First Session = kelompok kuis pertama yang diselesaikan user, apa pun hasilnya.
const markFirstSessionCompleted = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { first_session_completed: true },
  })
  if (user?.first_session_completed) return true

  await prisma.user.update({ where: { id: userId }, data: { first_session_completed: true } })
  return true
}

// POST /quiz/attempt
// Simpan 1 jawaban soal melengkapi ayat / drag and drop arabic (drag_ayat).
// TIDAK memotong nyawa di sini — nyawa cuma dipotong 1x setelah user
// menyelesaikan SELURUH kelompok ayat lewat submitGroupAttempt di bawah.
// Cocok dipakai untuk feedback benar/salah per soal secara real-time saat mengerjakan.
const submitAttempt = async (userId, { question_id, submitted_order, time_taken_seconds }) => {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: question_id },
    include: { options: true },
  })
  if (!question) throw new Error('QUESTION_NOT_FOUND')

  const { isCorrect, correctOrder } = gradeDragAnswer(question, submitted_order)

  const attempt = await prisma.userQuizAttempt.create({
    data: {
      user_id: userId,
      question_id,
      submitted_order,
      is_correct: isCorrect,
      time_taken_seconds: time_taken_seconds ?? null,
    },
  })

  return {
    attempt_id: attempt.id,
    is_correct: isCorrect,
    correct_order: correctOrder,
  }
}

// POST /quiz/group-attempt
// Submit SEMUA jawaban dalam 1 kelompok ayat sekaligus (idealnya 5 soal melengkapi
// ayat, sesuai pembagian kelompok yang sama seperti di audio). Nyawa BARU dipotong
// 1x DI SINI setelah seluruh kelompok selesai dikerjakan — benar atau salah semua
// tetap habis 1 nyawa (karena max_lives sekarang cuma 1, biasanya langsung habis
// sampai regen 8 jam berikutnya, nonton iklan, atau premium).
const submitGroupAttempt = async (userId, { answers }) => {
  if (!Array.isArray(answers) || answers.length === 0) throw new Error('ANSWERS_REQUIRED')

  // Nyawa harus masih ada SEBELUM kelompok mulai dikerjakan (kecuali user premium).
  await livesService.assertHasLives(userId)

  const results = []
  for (const ans of answers) {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: ans.question_id },
      include: { options: true },
    })
    if (!question) throw new Error('QUESTION_NOT_FOUND')

    const { isCorrect, correctOrder } = gradeDragAnswer(question, ans.submitted_order)

    const attempt = await prisma.userQuizAttempt.create({
      data: {
        user_id: userId,
        question_id: ans.question_id,
        submitted_order: ans.submitted_order,
        is_correct: isCorrect,
        time_taken_seconds: ans.time_taken_seconds ?? null,
      },
    })

    results.push({
      question_id: ans.question_id,
      attempt_id: attempt.id,
      is_correct: isCorrect,
      correct_order: correctOrder,
    })
  }

  const correctCount = results.filter((r) => r.is_correct).length

  // Kelompok sudah SELESAI dikerjakan -> potong 1 nyawa (sekali, bukan per soal).
  const livesStatus = await livesService.consumeLife(userId)
  const firstSessionCompleted = await markFirstSessionCompleted(userId)

  return {
    total_quiz: results.length,
    correct_count: correctCount,
    score_percentage: Math.round((correctCount / results.length) * 100),
    results,
    lives: livesStatus,
    first_session_completed: firstSessionCompleted,
  }
}

// GET /quiz/history — riwayat kuis user (dipakai buat statistik/progress)
const getUserHistory = async (userId) => {
  return prisma.userQuizAttempt.findMany({
    where: { user_id: userId },
    orderBy: { attempted_at: 'desc' },
    take: 50,
    select: {
      id: true,
      is_correct: true,
      time_taken_seconds: true,
      attempted_at: true,
      question: { select: { id: true, question_text: true, type: true } },
    },
  })
}

module.exports = {
  getQuestionsByAyah,
  getQuestionPackage,
  submitAttempt,
  submitGroupAttempt,
  getUserHistory,
}
