const audioService = require('./audio.service')
const { success, error } = require('../../utils/response')

const getAudioBySurah = async (req, res) => {
  try {
    const surahId = parseInt(req.params.surahId)
    if (isNaN(surahId)) return error(res, 'surahId tidak valid', 400)

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
    const ayahId = parseInt(req.params.ayahId)
    if (isNaN(ayahId)) return error(res, 'ayahId tidak valid', 400)

    const data = await audioService.getAudioByAyah(ayahId)
    return success(res, 'Berhasil mengambil audio ayat', data)
  } catch (err) {
    if (err.message === 'AYAH_NOT_FOUND') return error(res, 'Ayat tidak ditemukan', 404)
    console.error('[getAudioByAyah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getAudioBySurah, getAudioByAyah }
