const { prisma } = require('../../config/database')
const livesService = require('../lives/lives.service')

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

// GET /quiz/package?ayah_ids=12,13,14&language_code=id
// "Package" soal untuk 1 kelompok ayat sekaligus (kelompok yang sama seperti yang dipakai
// di stage listening — ayah_ids[] yang dikirim frontend). Satu kali panggilan API
// mengembalikan semua soal + jawaban + jenis soal untuk seluruh ayat dalam kelompok itu,
// jadi frontend tidak perlu memanggil API terpisah tiap pindah halaman/ayat.
// Sekalian disisipkan status nyawa user biar frontend langsung tahu boleh mulai kuis atau tidak.
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

// POST /quiz/attempt
// Simpan jawaban user, hitung benar/salah di server (jangan percaya client).
// Kalau salah -> kurangi 1 nyawa (kecuali user premium). Kalau nyawa sudah habis
// sebelum menjawab, tolak dulu di awal.
const submitAttempt = async (userId, { question_id, selected_option_id, time_taken_seconds }) => {
  await livesService.assertHasLives(userId)

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

  let livesStatus = null
  if (!isCorrect) {
    livesStatus = await livesService.consumeLife(userId)
  }

  return {
    attempt_id: attempt.id,
    is_correct: isCorrect,
    correct_option_id: correctOption?.id ?? null,
    lives: livesStatus,
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

module.exports = { getQuestionsByAyah, getQuestionPackage, submitAttempt, getUserHistory }
