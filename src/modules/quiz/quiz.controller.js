const { z } = require('zod')
const quizService = require('./quiz.service')
const { success, error } = require('../../utils/response')

const submitAttemptSchema = z.object({
  question_id: z.string().uuid(),
  selected_option_id: z.string().uuid(),
  time_taken_seconds: z.number().nonnegative().optional(),
})

const getQuestionsByAyah = async (req, res) => {
  try {
    const ayahId = req.params.ayahId
    if (!ayahId) return error(res, 'ayahId tidak valid', 400)

    const languageCode = req.query.language_code || 'id'
    const data = await quizService.getQuestionsByAyah(ayahId, languageCode)

    return success(res, 'Berhasil mengambil soal kuis', data)
  } catch (err) {
    if (err.message === 'LANGUAGE_NOT_FOUND') return error(res, 'Bahasa tidak ditemukan', 404)
    console.error('[getQuestionsByAyah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

// GET /quiz/package?ayah_ids=uuid1,uuid2,uuid3&language_code=id
// Satu kali panggilan -> semua soal+jawaban+jenis soal untuk 1 kelompok ayat, plus status nyawa.
const getQuestionPackage = async (req, res) => {
  try {
    const rawIds = req.query.ayah_ids
    if (!rawIds) return error(res, 'ayah_ids wajib diisi', 400)

    const ayahIds = String(rawIds)
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)

    if (ayahIds.length === 0) return error(res, 'ayah_ids tidak valid', 400)

    const languageCode = req.query.language_code || 'id'
    const data = await quizService.getQuestionPackage(req.user.id, ayahIds, languageCode)

    return success(res, 'Berhasil mengambil package soal kuis', data)
  } catch (err) {
    if (err.message === 'LANGUAGE_NOT_FOUND') return error(res, 'Bahasa tidak ditemukan', 404)
    if (err.message === 'AYAH_IDS_REQUIRED') return error(res, 'ayah_ids wajib diisi', 400)
    console.error('[getQuestionPackage]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const submitAttempt = async (req, res) => {
  try {
    const data = submitAttemptSchema.parse(req.body)
    const result = await quizService.submitAttempt(req.user.id, data)

    return success(res, 'Jawaban berhasil disimpan', result)
  } catch (err) {
    if (err.message === 'NO_LIVES_LEFT') return error(res, 'Nyawa kamu sudah habis', 403)
    if (err.message === 'QUESTION_NOT_FOUND') return error(res, 'Soal tidak ditemukan', 404)
    if (err.message === 'OPTION_NOT_FOUND') return error(res, 'Opsi jawaban tidak valid', 400)
    if (err.name === 'ZodError') return error(res, 'Input tidak valid', 400, err.issues)
    console.error('[submitAttempt]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getUserHistory = async (req, res) => {
  try {
    const data = await quizService.getUserHistory(req.user.id)
    return success(res, 'Berhasil mengambil riwayat kuis', data)
  } catch (err) {
    console.error('[getUserHistory]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getQuestionsByAyah, getQuestionPackage, submitAttempt, getUserHistory }
