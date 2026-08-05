const { z } = require('zod')
const surahService = require('./surah.service')
const { success, error } = require('../../utils/response')

// Query string selalu berupa string, makanya di-coerce ke number dulu.
// Juz Al-Quran cuma ada 1-30.
const listQuerySchema = z.object({
  juz: z.coerce.number().int().min(1, 'Juz minimal 1.').max(30, 'Juz maksimal 30.').optional(),
})

// GET /surah
// GET /surah?juz=5
const list = async (req, res, next) => {
  try {
    const { juz } = listQuerySchema.parse(req.query)
    const surahs = await surahService.getSurahs(juz)

    const message = juz ? `Daftar surat pada juz ${juz} berhasil diambil.` : 'Daftar surat berhasil diambil.'
    return success(res, message, surahs)
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, err.issues[0]?.message ?? 'Parameter tidak valid.', 422)
    }
    next(err)
  }
}

// Param `id` = UUID surat (bukan nomor 1-114)
const ayahsParamsSchema = z.object({
  id: z.string().uuid('ID surat tidak valid.'),
})

// GET /surah/:id/ayahs
const listArabicAyahs = async (req, res, next) => {
  try {
    const { id } = ayahsParamsSchema.parse(req.params)
    const result = await surahService.getArabicAyahsBySurah(id)

    return success(res, `Ayat (teks Arab) surat ${result.surah.name_transliteration} berhasil diambil.`, result)
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, err.issues[0]?.message ?? 'Parameter tidak valid.', 422)
    }
    if (err.message === 'SURAH_NOT_FOUND') {
      return error(res, 'Surat tidak ditemukan.', 404)
    }
    next(err)
  }
}

module.exports = { list, listArabicAyahs }
