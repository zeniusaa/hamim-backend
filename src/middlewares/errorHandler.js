// Global error handler — dipasang paling terakhir di app.js.
// Semua error yang di-throw atau di-pass via next(err) akan masuk sini.
// Tujuannya: satu tempat untuk tangani semua error, bukan per-route.

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  // Error dari Prisma (database)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah ada. ' + (err.meta?.target?.join(', ') ?? ''),
      errors: null,
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Data tidak ditemukan.',
      errors: null,
    })
  }

  // Error validasi (dari zod, dilempar manual)
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Data yang dikirim tidak valid.',
      errors: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Error dari Multer (upload file) — mis. file kegedean, atau field yang
  // tidak diharapkan multer dikirim di form-data
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Ukuran file terlalu besar. Maksimal 2 MB.',
      LIMIT_UNEXPECTED_FILE: 'Field file tidak sesuai. Kirim dengan nama field "avatar".',
    }
    return res.status(400).json({
      success: false,
      message: messages[err.code] || 'Gagal mengunggah file.',
      errors: null,
    })
  }

  // Error umum
  const statusCode = err.statusCode || 500
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server.',
    // err.code di sini adalah kode custom yang kita lempar sendiri (mis. EMAIL_NOT_VERIFIED),
    // bukan kode Prisma — supaya frontend bisa branch tanpa parsing pesan teks.
    code: err.code || undefined,
    errors: null,
  })
}

module.exports = errorHandler