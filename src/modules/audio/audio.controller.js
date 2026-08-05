const audioService = require('./audio.service')
const { success, error } = require('../../utils/response')

const getAudioBySurah = async (req, res) => {
  try {
    const surahId = req.params.surahId
    if (!surahId) return error(res, 'surahId tidak valid', 400)

    const data = await audioService.getAudioBySurah(surahId)
    return success(res, 'Berhasil mengambil audio surah', data)
  } catch (err) {
    if (err.message === 'SURAH_NOT_FOUND') return error(res, 'Surah tidak ditemukan', 404)
    console.error('[getAudioBySurah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getAudioByAyah = async (req, res) => {
  try {
    const ayahId = req.params.ayahId
    if (!ayahId) return error(res, 'ayahId tidak valid', 400)

    const data = await audioService.getAudioByAyah(ayahId)
    return success(res, 'Berhasil mengambil audio ayat', data)
  } catch (err) {
    if (err.message === 'AYAH_NOT_FOUND') return error(res, 'Ayat tidak ditemukan', 404)
    console.error('[getAudioByAyah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

// GET /audio/surah/:surahId/groups?language_code=id
// 1x panggilan -> semua kelompok ayat dalam 1 surat, tiap kelompok berisi
// audio + arabic + quiz sekaligus.
const getGroupsBySurah = async (req, res) => {
  try {
    const surahId = req.params.surahId
    if (!surahId) return error(res, 'surahId tidak valid', 400)

    const languageCode = req.query.language_code || 'id'
    const data = await audioService.getGroupsBySurah(surahId, req.user.id, languageCode)
    return success(res, 'Berhasil mengambil kelompok ayat', data)
  } catch (err) {
    if (err.message === 'SURAH_NOT_FOUND') return error(res, 'Surah tidak ditemukan', 404)
    if (err.message === 'LANGUAGE_NOT_FOUND') return error(res, 'Bahasa tidak ditemukan', 404)
    console.error('[getGroupsBySurah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

// GET /audio/surah/:surahId/groups/:ayahNumber?language_code=id
// 1x panggilan -> CUMA 1 kelompok yang mencakup ayahNumber tsb (misal ayat 1-4).
// ayahNumber tidak harus ayat pertama kelompok — ayat mana pun di dalam
// range kelompok itu akan balikin kelompok yang sama.
const getGroupByAyahNumber = async (req, res) => {
  try {
    const surahId = req.params.surahId
    const ayahNumber = Number(req.params.ayahNumber)
    if (!surahId) return error(res, 'surahId tidak valid', 400)
    if (!Number.isInteger(ayahNumber) || ayahNumber <= 0) return error(res, 'ayahNumber tidak valid', 400)

    const languageCode = req.query.language_code || 'id'
    const data = await audioService.getGroupByAyahNumber(surahId, ayahNumber, req.user.id, languageCode)
    return success(res, 'Berhasil mengambil kelompok ayat', data)
  } catch (err) {
    if (err.message === 'SURAH_NOT_FOUND') return error(res, 'Surah tidak ditemukan', 404)
    if (err.message === 'LANGUAGE_NOT_FOUND') return error(res, 'Bahasa tidak ditemukan', 404)
    if (err.message === 'GROUP_NOT_FOUND') return error(res, 'Kelompok ayat tidak ditemukan', 404)
    console.error('[getGroupByAyahNumber]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getAudioBySurah, getAudioByAyah, getGroupsBySurah, getGroupByAyahNumber }
