const livesService = require('./lives.service')
const { success, error } = require('../../utils/response')

const getStatus = async (req, res) => {
  try {
    const data = await livesService.getStatus(req.user.id)
    return success(res, 'Berhasil mengambil status nyawa', data)
  } catch (err) {
    console.error('[lives.getStatus]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const watchAd = async (req, res) => {
  try {
    const data = await livesService.addLifeFromAd(req.user.id)
    return success(res, data.added === false ? data.message : 'Nyawa bertambah 1', data)
  } catch (err) {
    console.error('[lives.watchAd]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { getStatus, watchAd }
