const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const assetsController = require('./assets.controller')

// GET  /assets/bundles           — list semua bundle + status downloaded
// GET  /assets/bundles/:id       — detail bundle + list file di dalamnya
// POST /assets/download/confirm  — konfirmasi sudah download bundle
// GET  /assets/check-updates     — cek bundle baru berdasarkan versi user
router.get('/bundles', authMiddleware, assetsController.listBundles)
router.get('/bundles/:id', authMiddleware, assetsController.getBundleDetail)
router.post('/download/confirm', authMiddleware, assetsController.confirmDownload)
router.get('/check-updates', authMiddleware, assetsController.checkUpdates)
router.get('/icons', authMiddleware, assetsController.listIcons)
router.get('/backgrounds', authMiddleware, assetsController.listBackgrounds)
router.get('/music', authMiddleware, assetsController.listMusic)

module.exports = router
