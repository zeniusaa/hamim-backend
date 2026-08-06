const progressService = require('./progress.service')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')
const HttpError = require('../../utils/HttpError')

// Gaya error handling konsisten: lempar HttpError → errorHandler global.
// (Sebelumnya try/catch manual + error(res) di tiap handler.)

const getProgress = asyncHandler(async (req, res) => {
  const data = await progressService.getProgress(req.user.id)
  return success(res, 'Berhasil mengambil progress', data)
})

const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const data = await progressService.getHistory(req.user.id, page, limit)
  return success(res, 'Berhasil mengambil riwayat aktivitas', data)
})

const updateProgress = asyncHandler(async (req, res) => {
  const { ayah_id, ayah_ids, surah_id, stage, score, duration_seconds } = req.body

  if (!ayah_id || !surah_id || !stage) {
    throw new HttpError('ayah_id, surah_id, dan stage wajib diisi', 400)
  }

  const validStages = ['listening', 'reading', 'quiz']
  if (!validStages.includes(stage)) {
    throw new HttpError(`stage harus salah satu dari: ${validStages.join(', ')}`, 400)
  }

  // Untuk listening: ayah_ids wajib ada (array semua ayat dalam kelompok audio)
  if (stage === 'listening' && (!Array.isArray(ayah_ids) || ayah_ids.length === 0)) {
    throw new HttpError('ayah_ids (array) wajib diisi untuk stage listening', 400)
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
})

const getProgressBySurah = asyncHandler(async (req, res) => {
  const surahId = req.params.surahId
  if (!surahId) throw new HttpError('surahId tidak valid', 400)

  const data = await progressService.getProgressBySurah(req.user.id, surahId)
  return success(res, 'Berhasil mengambil progress surat', data)
})

module.exports = { getProgress, getHistory, updateProgress, getProgressBySurah }
