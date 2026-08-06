const { z } = require('zod')
const quizService = require('./quiz.service')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')
const HttpError = require('../../utils/HttpError')

// Jawaban tipe drag_ayat = urutan option_id yang disusun user (potongan kata).
const submittedOrderSchema = z.array(z.string().uuid()).min(1)

const submitAttemptSchema = z.object({
  question_id: z.string().uuid(),
  submitted_order: submittedOrderSchema,
  time_taken_seconds: z.number().nonnegative().optional(),
})

const submitGroupAttemptSchema = z.object({
  // Idempotency key opsional: key unik per submit kelompok (misal UUID).
  // Kalau key yang sama dikirim lagi (double-tap / retry), server mengembalikan
  // hasil yang sudah tersimpan tanpa memotong nyawa lagi.
  idempotency_key: z.string().min(8).max(64).optional(),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        submitted_order: submittedOrderSchema,
        time_taken_seconds: z.number().nonnegative().optional(),
      })
    )
    .min(1),
})

// Gaya error handling SEKARANG konsisten di semua controller:
// lempar HttpError di service/controller → ditangkap errorHandler global.
// (Sebelumnya campur: try/catch manual + error(res) di sini, next(err) di
// tempat lain, ZodError jadi 400 di sini tapi 422 di errorHandler.)

const getQuestionsByAyah = asyncHandler(async (req, res) => {
  const ayahId = req.params.ayahId
  if (!ayahId) throw new HttpError('ayahId tidak valid', 400)

  const languageCode = req.query.language_code || 'id'
  const data = await quizService.getQuestionsByAyah(ayahId, languageCode)

  return success(res, 'Berhasil mengambil soal kuis', data)
})

// GET /quiz/package?ayah_ids=uuid1,uuid2,uuid3&language_code=id
// Satu kali panggilan -> semua soal untuk 1 kelompok ayat, plus status nyawa.
const getQuestionPackage = asyncHandler(async (req, res) => {
  const rawIds = req.query.ayah_ids
  if (!rawIds) throw new HttpError('ayah_ids wajib diisi', 400, 'AYAH_IDS_REQUIRED')

  const ayahIds = String(rawIds)
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  if (ayahIds.length === 0) throw new HttpError('ayah_ids tidak valid', 400, 'AYAH_IDS_REQUIRED')

  const languageCode = req.query.language_code || 'id'
  const data = await quizService.getQuestionPackage(req.user.id, ayahIds, languageCode)

  return success(res, 'Berhasil mengambil package soal kuis', data)
})

// POST /quiz/attempt — submit 1 jawaban soal (tidak memotong nyawa)
const submitAttempt = asyncHandler(async (req, res) => {
  const data = submitAttemptSchema.parse(req.body)
  const result = await quizService.submitAttempt(req.user.id, data)

  return success(res, 'Jawaban berhasil disimpan', result)
})

// POST /quiz/group-attempt — submit semua jawaban 1 kelompok ayat sekaligus,
// nyawa dipotong 1x setelah kelompok ini selesai dikerjakan.
const submitGroupAttempt = asyncHandler(async (req, res) => {
  const data = submitGroupAttemptSchema.parse(req.body)
  const result = await quizService.submitGroupAttempt(req.user.id, data)

  return success(res, 'Kelompok ayat berhasil diselesaikan', result)
})

const getUserHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const data = await quizService.getUserHistory(req.user.id, page, limit)
  return success(res, 'Berhasil mengambil riwayat kuis', data)
})

module.exports = {
  getQuestionsByAyah,
  getQuestionPackage,
  submitAttempt,
  submitGroupAttempt,
  getUserHistory,
}
