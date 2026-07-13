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

  // Error umum
  const statusCode = err.statusCode || 500
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server.',
    errors: null,
  })
}

module.exports = errorHandler