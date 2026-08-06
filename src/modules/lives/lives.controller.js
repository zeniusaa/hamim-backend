const livesService = require('./lives.service')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

// Gaya error handling konsisten: lempar HttpError (dari service) → errorHandler global.

const getStatus = asyncHandler(async (req, res) => {
  const data = await livesService.getStatus(req.user.id)
  return success(res, 'Berhasil mengambil status nyawa', data)
})

const watchAd = asyncHandler(async (req, res) => {
  const data = await livesService.addLifeFromAd(req.user.id)
  return success(res, data.added === false ? data.message : 'Nyawa bertambah 1', data)
})

module.exports = { getStatus, watchAd }
