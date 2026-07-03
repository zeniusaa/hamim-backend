const progressService = require('./progress.service')
const { success, error } = require('../../utils/response')

const getProgress = async (req, res) => {
  try {
    const data = await progressService.getProgress(req.user.id)
    return success(res, 'Berhasil mengambil progress', data)
  } catch (err) {
    console.error('[getProgress]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const data = await progressService.getHistory(req.user.id, page, limit)
    return success(res, 'Berhasil mengambil riwayat aktivitas', data)
  } catch (err) {
    console.error('[getHistory]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const updateProgress = async (req, res) => {
  try {
    const { ayah_id, ayah_ids, surah_id, stage, score, duration_seconds } = req.body

    if (!ayah_id || !surah_id || !stage) {
      return error(res, 'ayah_id, surah_id, dan stage wajib diisi', 400)
    }

    const validStages = ['listening', 'reading', 'quiz']
    if (!validStages.includes(stage)) {
      return error(res, `stage harus salah satu dari: ${validStages.join(', ')}`, 400)
    }

    // Untuk listening: ayah_ids wajib ada (array semua ayat dalam kelompok audio)
    if (stage === 'listening' && (!Array.isArray(ayah_ids) || ayah_ids.length === 0)) {
      return error(res, 'ayah_ids (array) wajib diisi untuk stage listening', 400)
    }

    const data = await progressService.updateProgress(req.user.id, {
      ayah_id,
      ayah_ids,
      surah_id,
      stage,
      score,
      duration_seconds,
    })
    return success(res, 'Progress berhasil diperbarui', data)
  } catch (err) {
    console.error('[updateProgress]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getProgressBySurah = async (req, res) => {
  try {
    const surahId = parseInt(req.params.surahId)
    if (isNaN(surahId)) return error(res, 'surahId tidak valid', 400)

    const data = await progressService.getProgressBySurah(req.user.id, surahId)
    return success(res, 'Berhasil mengambil progress surat', data)
  } catch (err) {
    if (err.message === 'SURAH_NOT_FOUND') return error(res, 'Surah tidak ditemukan', 404)
    console.error('[getProgressBySurah]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getProgress, getHistory, updateProgress, getProgressBySurah }
