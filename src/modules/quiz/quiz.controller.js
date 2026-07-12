const { z } = require('zod')
const quizService = require('./quiz.service')
const { success, error } = require('../../utils/response')

const submitAttemptSchema = z.object({
  question_id: z.number().int(),
  selected_option_id: z.number().int(),
  time_taken_seconds: z.number().nonnegative().optional(),
})

const getQuestionsByAyah = async (req, res) => {
  try {
    const ayahId = parseInt(req.params.ayahId)
    if (isNaN(ayahId)) return error(res, 'ayahId tidak valid', 400)

    const languageCode = req.query.language_code || 'id'
    const data = await quizService.getQuestionsByAyah(ayahId, languageCode)

    return success(res, 'Berhasil mengambil soal kuis', data)
  } catch (err) {
    if (err.message === 'LANGUAGE_NOT_FOUND') return error(res, 'Bahasa tidak ditemukan', 404)
    console.error('[getQuestionsByAyah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const submitAttempt = async (req, res) => {
  try {
    const data = submitAttemptSchema.parse(req.body)
    const result = await quizService.submitAttempt(req.user.id, data)

    return success(res, 'Jawaban berhasil disimpan', result)
  } catch (err) {
    if (err.message === 'QUESTION_NOT_FOUND') return error(res, 'Soal tidak ditemukan', 404)
    if (err.message === 'OPTION_NOT_FOUND') return error(res, 'Opsi jawaban tidak valid', 400)
    if (err.name === 'ZodError') return error(res, 'Input tidak valid', 400, err.errors)
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

module.exports = { getQuestionsByAyah, submitAttempt, getUserHistory }