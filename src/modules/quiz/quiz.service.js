const { prisma } = require('../../config/database')
const livesService = require('../lives/lives.service')
const HttpError = require('../../utils/HttpError')

// Fisher-Yates shuffle — dipakai untuk mengacak urutan options SEBELUM
// dikirim ke client, supaya urutan benar (order_index) tidak bisa dibaca
// client dari urutan array response.
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Siapkan soal untuk dikirim ke client:
// - buang order_index (kunci jawaban drag_ayat) & is_correct
// - acak urutan options supaya client tidak bisa menebak jawaban dari urutan
// Dipakai di semua endpoint yang MENGIRIM soal (GET saja).
const sanitizeQuestionForClient = (q) => ({
  ...q,
  options: shuffle(q.options).map(({ id, option_text }) => ({ id, option_text })),
})

// GET /quiz/ayah/:ayahId?language_code=id
// Ambil soal kuis (melengkapi ayat / drag and drop arabic) untuk 1 ayat tertentu.
const getQuestionsByAyah = async (ayahId, languageCode = 'id') => {
  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new HttpError('Bahasa tidak ditemukan', 404, 'LANGUAGE_NOT_FOUND')

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

  return questions.map(sanitizeQuestionForClient)
}

// GET /quiz/package?ayah_ids=12,13,14&language_code=id
// "Package" soal untuk 1 kelompok ayat sekaligus (kelompok yang sama seperti yang dipakai
// di stage listening — ayah_ids[] yang dikirim frontend). Satu kali panggilan API
// mengembalikan semua soal (tipe drag_ayat) untuk seluruh ayat dalam kelompok itu.
// Sekalian disisipkan status nyawa user biar frontend langsung tahu boleh mulai kuis atau tidak.
// Catatan: untuk kombinasi audio + arabic + quiz sekaligus dalam 1x panggilan,
// pakai GET /audio/surah/:surahId/groups.
const getQuestionPackage = async (userId, ayahIds, languageCode = 'id') => {
  if (!Array.isArray(ayahIds) || ayahIds.length === 0) {
    throw new HttpError('ayah_ids wajib diisi', 400, 'AYAH_IDS_REQUIRED')
  }

  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new HttpError('Bahasa tidak ditemukan', 404, 'LANGUAGE_NOT_FOUND')

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
      questions: a.quiz_questions.map(sanitizeQuestionForClient),
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
// `client` = prisma global ATAU tx dari $transaction (biar atomic sama-sama).
const markFirstSessionCompleted = async (client, userId) => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { first_session_completed: true },
  })
  if (user?.first_session_completed) return true

  await client.user.update({ where: { id: userId }, data: { first_session_completed: true } })
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
  if (!question) throw new HttpError('Soal tidak ditemukan', 404, 'QUESTION_NOT_FOUND')

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
//
// SEMUA operasi dibungkus dalam SATU transaksi ($transaction):
//   - Attempt tidak akan tersimpan kalau potong nyawa gagal (dan sebaliknya).
//   - Potong nyawa pakai updateMany({ current_lives: { gt: 0 } }) = atomic decrement,
//     jadi dua request paralel tidak bisa double-consume / nyawa tidak pernah negatif.
// Rebuild hasil dari attempt yang sudah tersimpan untuk 1 idempotency key.
// correct_order TIDAK disimpan di DB (dihitung dari options), jadi dihitung
// ulang dari soal aslinya.
const buildIdempotentResult = async (tx, userId, idempotencyKey) => {
  const attempts = await tx.userQuizAttempt.findMany({
    where: { user_id: userId, idempotency_key: idempotencyKey },
    select: {
      question_id: true,
      id: true,
      is_correct: true,
      submitted_order: true,
      question: { select: { options: true } },
    },
  })

  const results = attempts.map((a) => {
    const { correctOrder } = gradeDragAnswer(a.question, a.submitted_order)
    return {
      question_id: a.question_id,
      attempt_id: a.id,
      is_correct: a.is_correct,
      correct_order: correctOrder,
    }
  })

  const livesStatus = await livesService.getStatus(userId)
  const correctCount = results.filter((r) => r.is_correct).length

  return {
    idempotent: true,
    total_quiz: results.length,
    correct_count: correctCount,
    score_percentage: Math.round((correctCount / results.length) * 100),
    results,
    lives: livesStatus,
  }
}

const submitGroupAttempt = async (userId, { answers, idempotency_key }) => {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new HttpError('answers wajib diisi', 400, 'ANSWERS_REQUIRED')
  }

  // Idempotency — cek DULUAN, SEBELUM cek nyawa:
  //   - Double-tap tombol / retry jaringan = submit kedua datang saat nyawa
  //     sudah habis dipotong submit pertama. Kalau cek nyawa lebih dulu,
  //     submit kedua malah kena 403 NO_LIVES_LEFT, bukan dapat hasil lama.
  //   - Dua request PARALEL dengan key sama: dua-duanya lolos cek ini → dua-duanya
  //     masuk transaksi → yang kalah kena unique constraint P2002 → di-tangkap
  //     di bawah dan dikembalikan hasil lama. Aman.
  if (idempotency_key) {
    const existing = await prisma.userQuizAttempt.findFirst({
      where: { user_id: userId, idempotency_key },
      select: { id: true },
    })
    if (existing) {
      return prisma.$transaction((tx) => buildIdempotentResult(tx, userId, idempotency_key))
    }
  }

  // Fast-fail: kalau jelas-jelas tidak punya nyawa, tolak sebelum buka transaksi.
  // Race window antara cek ini & transaksi tetap diamankan oleh atomic decrement di bawah.
  await livesService.assertHasLives(userId)

  return prisma.$transaction(async (tx) => {
    const results = []
    for (const ans of answers) {
      const question = await tx.quizQuestion.findUnique({
        where: { id: ans.question_id },
        include: { options: true },
      })
      if (!question) throw new HttpError('Soal tidak ditemukan', 404, 'QUESTION_NOT_FOUND')

      const { isCorrect, correctOrder } = gradeDragAnswer(question, ans.submitted_order)

      try {
        const attempt = await tx.userQuizAttempt.create({
          data: {
            user_id: userId,
            question_id: ans.question_id,
            idempotency_key: idempotency_key ?? null,
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
      } catch (err) {
        // P2002 = unique constraint (user_id, question_id, idempotency_key).
        // Terjadi kalau request paralel dengan key yang sama menang duluan —
        // kita bukan double-submit beneran, tapi balapan. Balikin hasil yang
        // sudah tersimpan; kalau belum lengkap, biarkan request lain yang
        // menyelesaikan (transaksi ini di-rollback otomatis oleh throw).
        if (err.code === 'P2002') {
          return buildIdempotentResult(tx, userId, idempotency_key)
        }
        throw err
      }
    }

    const correctCount = results.filter((r) => r.is_correct).length

    // Kelompok sudah SELESAI dikerjakan -> potong 1 nyawa (sekali, bukan per soal).
    // Atomic: kalau nyawa habis di tengah (count 0), transaksi di-rollback otomatis.
    const livesStatus = await livesService.consumeLifeInTransaction(tx, userId)
    const firstSessionCompleted = await markFirstSessionCompleted(tx, userId)

    return {
      total_quiz: results.length,
      correct_count: correctCount,
      score_percentage: Math.round((correctCount / results.length) * 100),
      results,
      lives: livesStatus,
      first_session_completed: firstSessionCompleted,
    }
  })
}

// GET /quiz/history — riwayat kuis user (dipakai buat statistik/progress)
// Dengan pagination (page & limit) — sebelumnya take:50 tanpa halaman,
// riwayat panjang tidak bisa diambil seluruhnya.
const getUserHistory = async (userId, page = 1, limit = 20) => {
  const safePage = Math.max(1, parseInt(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20))

  const [attempts, total] = await Promise.all([
    prisma.userQuizAttempt.findMany({
      where: { user_id: userId },
      orderBy: { attempted_at: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        id: true,
        is_correct: true,
        time_taken_seconds: true,
        attempted_at: true,
        question: { select: { id: true, question_text: true, type: true } },
      },
    }),
    prisma.userQuizAttempt.count({ where: { user_id: userId } }),
  ])

  return {
    attempts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.ceil(total / safeLimit),
    },
  }
}

module.exports = {
  getQuestionsByAyah,
  getQuestionPackage,
  submitAttempt,
  submitGroupAttempt,
  getUserHistory,
  sanitizeQuestionForClient,
}
