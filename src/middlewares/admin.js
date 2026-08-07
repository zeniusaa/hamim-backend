const { verifyAccessToken } = require('../utils/jwt')
const { prisma } = require('../config/database')
const { error } = require('../utils/response')

// Email admin dari env (pisah koma) — cara cepat jadi admin tanpa ubah DB.
const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

// Cek apakah user (row DB) berhak akses admin:
//   1. role = 'ADMIN' di tabel User (cara utama), ATAU
//   2. email-nya terdaftar di env ADMIN_EMAILS (cara cepat, tanpa migration)
const isAdminUser = (user) =>
  user.role === 'ADMIN' || getAdminEmails().includes((user.email || '').toLowerCase())

// Middleware khusus route admin — dipasang di SEMUA route /admin/* kecuali login.
// Kerjanya mirip authMiddleware, tapi mengecek role admin juga. Sengaja tidak
// meng-import authMiddleware supaya route admin tidak terikat aturan user
// (misal enforce email_verified) — admin sudah dianggap trusted.
const adminOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Token tidak ditemukan. Silakan login sebagai admin.', 401)
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

    // Ambil data terbaru dari DB — kalau admin di-demote, efeknya langsung,
    // token lama tidak bisa dipakai lagi.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, deleted_at: true },
    })

    if (!user) {
      return error(res, 'User tidak ditemukan.', 401)
    }

    if (user.deleted_at) {
      return error(res, 'Akun sedang dalam proses penghapusan.', 403)
    }

    if (!isAdminUser(user)) {
      return error(res, 'Akses ditolak. Hanya admin yang diizinkan.', 403)
    }

    req.user = { id: user.id, email: user.email, role: user.role }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Sesi admin habis. Silakan login ulang.', 401)
    }
    return error(res, 'Token tidak valid.', 401)
  }
}

module.exports = adminOnly
module.exports.isAdminUser = isAdminUser
module.exports.getAdminEmails = getAdminEmails
