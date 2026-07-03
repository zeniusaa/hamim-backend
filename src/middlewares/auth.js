const { verifyAccessToken } = require('../utils/jwt')
const { error } = require('../utils/response')

// Middleware ini dipasang di route yang butuh login.
// Cara kerja:
//   1. Ambil token dari header Authorization: Bearer <token>
//   2. Verifikasi token — kalau expired atau salah, tolak request
//   3. Kalau valid, simpan data user ke req.user supaya bisa dipakai di controller
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Token tidak ditemukan. Silakan login terlebih dahulu.', 401)
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

    // decoded berisi payload yang kita simpan saat generate token: { id, email }
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Sesi habis. Silakan login ulang.', 401)
    }
    return error(res, 'Token tidak valid.', 401)
  }
}

module.exports = authMiddleware
