const assetsService = require('./assets.service')
const { success, error } = require('../../utils/response')

const listBundles = async (req, res) => {
  try {
    const data = await assetsService.listBundles(req.user.id)
    return success(res, 'Berhasil mengambil daftar bundle', data)
  } catch (err) {
    console.error('[listBundles]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const getBundleDetail = async (req, res) => {
  try {
    const bundleId = parseInt(req.params.id)
    if (isNaN(bundleId)) return error(res, 'bundleId tidak valid', 400)

    const data = await assetsService.getBundleDetail(bundleId)
    return success(res, 'Berhasil mengambil detail bundle', data)
  } catch (err) {
    if (err.message === 'BUNDLE_NOT_FOUND') return error(res, 'Bundle tidak ditemukan', 404)
    console.error('[getBundleDetail]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const confirmDownload = async (req, res) => {
  try {
    const { bundle_id, app_version } = req.body
    if (!bundle_id) return error(res, 'bundle_id wajib diisi', 400)

    const data = await assetsService.confirmDownload(req.user.id, bundle_id, app_version)
    return success(res, 'Download berhasil dikonfirmasi', data)
  } catch (err) {
    if (err.message === 'BUNDLE_NOT_FOUND') return error(res, 'Bundle tidak ditemukan', 404)
    console.error('[confirmDownload]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

const checkUpdates = async (req, res) => {
  try {
    // Query param: ?versions=juz_30_audio:1,ui_basic:2
    const data = await assetsService.checkUpdates(req.query.versions || '')
    return success(res, 'Berhasil cek pembaruan aset', data)
  } catch (err) {
    console.error('[checkUpdates]', err)
    return error(res, 'Terjadi kesalahan server', 500)
  }
}

module.exports = { listBundles, getBundleDetail, confirmDownload, checkUpdates }
