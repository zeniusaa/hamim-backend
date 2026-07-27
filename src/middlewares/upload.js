const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Semua avatar disimpan lokal di server, di /uploads/avatars, dan disajikan
// balik lewat express.static (lihat app.js) sebagai http://<BACKEND_URL>/uploads/avatars/<file>.
const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars')
fs.mkdirSync(AVATAR_DIR, { recursive: true })

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB — cukup untuk foto profil, cegah upload asal gede

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // authMiddleware jalan sebelum ini di route, jadi req.user sudah ada.
    // Nama file disengaja unik & tidak nebak-able (bukan pakai nama asli file).
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    cb(null, `${req.user.id}-${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Format file harus JPG, PNG, atau WEBP.')
    err.statusCode = 400
    return cb(err)
  }
  cb(null, true)
}

// Dipakai sebagai middleware di route: authMiddleware dulu (biar req.user ada), baru ini.
// Field form-data yang diharapkan bernama "avatar".
const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('avatar')

module.exports = { uploadAvatar, AVATAR_DIR, MAX_FILE_SIZE_BYTES }
