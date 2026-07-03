const levelService = require('./level.service')
const { success, error } = require('../../utils/response')

const getMyLevel = async (req, res) => {
  try {
    const data = await levelService.getMyLevel(req.user.id)
    return success(res, 'Berhasil mengambil data level', data)
  } catch (err) {
    console.error('[getMyLevel]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getLevelHistory = async (req, res) => {
  try {
    const data = await levelService.getLevelHistory(req.user.id)
    return success(res, 'Berhasil mengambil riwayat level', data)
  } catch (err) {
    console.error('[getLevelHistory]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getLevelInfo = async (req, res) => {
  try {
    const data = levelService.getAllLevelInfo()
    return success(res, 'Berhasil mengambil info level', data)
  } catch (err) {
    console.error('[getLevelInfo]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const data = await levelService.getLeaderboard(limit)
    return success(res, 'Berhasil mengambil leaderboard', data)
  } catch (err) {
    console.error('[getLeaderboard]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getMyLevel, getLevelHistory, getLevelInfo, getLeaderboard }
