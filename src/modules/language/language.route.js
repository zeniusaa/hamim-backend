const express = require('express')
const controller = require('./language.controller')

const router = express.Router()

// GET /languages — publik, dipanggil di layar "pilih bahasa"
// sebelum user tahu apakah dia sudah punya akun atau belum
router.get('/', controller.list)

module.exports = router
