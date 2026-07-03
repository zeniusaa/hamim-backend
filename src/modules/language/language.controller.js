const languageService = require('./language.service')
const { success } = require('../../utils/response')

// GET /languages
const list = async (req, res, next) => {
  try {
    const languages = await languageService.getActiveLanguages()
    return success(res, 'Daftar bahasa berhasil diambil.', languages)
  } catch (err) {
    next(err)
  }
}

module.exports = { list }
