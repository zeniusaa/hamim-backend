const { prisma } = require('../../config/database')

// GET /quiz/ayah/:ayahId?language_code=id
// Ambil soal kuis untuk 1 ayat tertentu, sesuai bahasa user.
// is_correct SENGAJA tidak dikirim ke client — biar tidak bisa dicontek dari response.
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

// POST /quiz/attempt
// Simpan jawaban user, hitung benar/salah di server (jangan percaya client).
const submitAttempt = async (userId, { question_id, selected_option_id, time_taken_seconds }) => {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: question_id },
    include: { options: true },
  })
  if (!question) throw new Error('QUESTION_NOT_FOUND')

  const selectedOption = question.options.find((o) => o.id === selected_option_id)
  if (!selectedOption) throw new Error('OPTION_NOT_FOUND')

  const isCorrect = selectedOption.is_correct
  const correctOption = question.options.find((o) => o.is_correct)

  const attempt = await prisma.userQuizAttempt.create({
    data: {
      user_id: userId,
      question_id,
      selected_option_id,
      is_correct: isCorrect,
      time_taken_seconds: time_taken_seconds ?? null,
    },
  })

  return {
    attempt_id: attempt.id,
    is_correct: isCorrect,
    correct_option_id: correctOption?.id ?? null,
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

module.exports = { getQuestionsByAyah, submitAttempt, getUserHistory }