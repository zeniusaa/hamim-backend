require('dotenv').config()

// Paling atas & sebelum apa pun — supaya semua timestamp yang dikirim lewat
// JSON (res.json) tampil dalam WIB (UTC+7), bukan UTC. Lihat komentar di file
// itu untuk detail; ini tidak mengubah cara waktu disimpan di database.
const { toWIBString } = require('./utils/timezone')

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const path = require('path')

const errorHandler = require('./middlewares/errorHandler')

// Pastikan config passport diload — walaupun tidak dipakai langsung di sini,
// require ini mendaftarkan Google Strategy ke passport secara global.
require('./config/passport')

const app = express()

// ─── Security & Parsing Middleware ──────────────────────────
// helmet: pasang security HTTP headers otomatis
app.use(helmet())

// cors: izinkan request dari mobile app / frontend.
// Origin diambil dari env CORS_ORIGINS (pisah koma, contoh:
// https://app.hamim.id,https://admin.hamim.id).
// Kalau kosong / development → '*' (semua origin).
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}))

// Parse JSON body dari request
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Request ID + Structured Logging ─────────────────────────
// Setiap request diberi ID unik (req.id) supaya bisa di-trace di log —
// debugging produksi jadi mudah: satu request = satu ID di semua baris log.
// Log request/response dalam format JSON satu baris, bukan console.error
// polos yang susah digrep.
const crypto = require('crypto')
app.use((req, res, next) => {
  req.id = crypto.randomUUID().slice(0, 8)
  res.setHeader('X-Request-Id', req.id)

  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    const line = JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info',
      ts: new Date().toISOString(),
      req_id: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(durationMs * 10) / 10,
      user_id: req.user?.id ?? null,
    })
    if (res.statusCode >= 500) console.error(line)
    else console.log(line)
  })
  next()
})

// ─── BigInt-safe JSON ──────────────────────────────────────────
// Prisma mengembalikan kolom BigInt (file_size_bytes, total_size_bytes, dst.)
// sebagai tipe JS BigInt. JSON.stringify (yang dipakai res.json) crash dengan
// "Do not know how to serialize a BigInt" → semua endpoint assets selalu 500.
// Override res.json global: konversi BigInt → string sebelum serialize.
const bigintReplacer = (key, value) =>
  typeof value === 'bigint' ? value.toString() : value

app.use((req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    const safe = JSON.stringify(body, bigintReplacer)
    return originalJson(safe === undefined ? body : JSON.parse(safe))
  }
  next()
})

// ─── File Upload (avatar, dll) ──────────────────────────────
// Sajikan folder /uploads sebagai file statis publik, contoh:
// http://localhost:3000/uploads/avatars/<nama-file>.jpg
// crossOriginResourcePolicy di-set 'cross-origin' khusus di sini supaya
// gambarnya tetap bisa di-load dari domain/app lain (helmet defaultnya
// 'same-origin', yang bakal ngeblok <img> dari luar origin backend ini).
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  },
  express.static(path.join(process.cwd(), 'uploads'))
)

// Logger HTTP request — hanya tampil saat development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ─── Health Check ────────────────────────────────────────────
// Cek server hidup + database masih bisa diakses.
// Sebelumnya cuma return 'OK' tanpa cek DB — monitoring bakal bilang
// sehat padahal DB-nya mati. Sekarang: SELECT 1 ke DB; kalau gagal → 503.
app.get('/health', async (req, res) => {
  try {
    const { prisma } = require('./config/database')
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'OK', database: 'OK', timestamp: toWIBString(new Date()) })
  } catch (err) {
    console.error('[health] Database tidak bisa diakses:', err.message)
    res.status(503).json({ status: 'DEGRADED', database: 'DOWN', timestamp: toWIBString(new Date()) })
  }
})

// ─── Routes ──────────────────────────────────────────────────
app.use('/auth',      require('./modules/auth/auth.route'))
app.use('/languages', require('./modules/language/language.route'))
app.use('/profile',   require('./modules/profile/profile.route'))
app.use('/audio',     require('./modules/audio/audio.route'))
app.use('/assets',    require('./modules/assets/assets.route'))
app.use('/progress',  require('./modules/progress/progress.route'))
app.use('/level',     require('./modules/level/level.route'))
app.use('/quiz',      require('./modules/quiz/quiz.route'))
app.use('/lives',     require('./modules/lives/lives.route'))
app.use('/surah',     require('./modules/surah/surah.route'))
// Modul lain akan didaftarkan di sini seiring pengembangan:
// app.use('/user', require('./modules/user/user.route'))
// app.use('/quran', require('./modules/quran/quran.route'))

// ─── OpenAPI Docs ────────────────────────────────────────────
// Spec API dalam format OpenAPI 3.0 — bisa dibuka di editor.swagger.io
// atau dipakai tool lain (codegen, mocking, dll). File: src/docs/openapi.json
app.get('/api-docs', (req, res) => {
  res.json(require('./docs/openapi.json'))
})

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' })
})

// ─── Global Error Handler ────────────────────────────────────
// HARUS dipasang paling terakhir dan punya 4 parameter (err, req, res, next)
app.use(errorHandler)

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  console.log(`\n🕌 HAMIM Backend berjalan di http://localhost:${PORT}`)
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Health check: http://localhost:${PORT}/health\n`)

  // Cek & hapus permanen akun yang sudah 30 hari soft-deleted.
  // Jalan sekali saat startup, lalu berulang tiap 6 jam selama server hidup.
  const { startCleanupScheduler } = require('./utils/cleanupDeletedUsers')
  global.__cleanupScheduler = startCleanupScheduler()
})

// ─── Graceful Shutdown ─────────────────────────────────────────
// Tutup HTTP server + koneksi DB dengan rapi saat proses menerima
// SIGTERM/SIGINT (Ctrl+C, docker stop, pm2 stop, systemd stop, dll).
// Tanpa ini, koneksi DB menggantung & request in-flight terputus paksa.
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} diterima. Menutup server dengan rapi...`)

  // Hentikan scheduler cleanup (jangan biarkan timer menahan proses)
  if (global.__cleanupScheduler) clearInterval(global.__cleanupScheduler)

  server.close(async () => {
    try {
      const { prisma } = require('./config/database')
      await prisma.$disconnect()
      console.log('Koneksi database ditutup. Bye!')
      process.exit(0)
    } catch (err) {
      console.error('Gagal menutup koneksi database:', err.message)
      process.exit(1)
    }
  })

  // Safety net: kalau koneksi macet, paksa exit setelah 10 detik
  setTimeout(() => {
    console.error('Timeout menunggu server tertutup. Paksa exit.')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

module.exports = app