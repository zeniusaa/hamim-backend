require('dotenv').config()

// Paling atas & sebelum apa pun — supaya semua timestamp yang dikirim lewat
// JSON (res.json) tampil dalam WIB (UTC+7), bukan UTC. Lihat komentar di file
// itu untuk detail; ini tidak mengubah cara waktu disimpan di database.
const { toWIBString } = require('./utils/timezone')

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const errorHandler = require('./middlewares/errorHandler')

// Pastikan config passport diload — walaupun tidak dipakai langsung di sini,
// require ini mendaftarkan Google Strategy ke passport secara global.
require('./config/passport')

const app = express()

// ─── Security & Parsing Middleware ──────────────────────────
// helmet: pasang security HTTP headers otomatis
app.use(helmet())

// cors: izinkan request dari mobile app
// Di production, ganti origin dengan domain yang diizinkan
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']  // ganti saat production
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}))

// Parse JSON body dari request
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logger HTTP request — hanya tampil saat development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ─── Health Check ────────────────────────────────────────────
// Endpoint sederhana untuk cek apakah server hidup.
// Berguna untuk monitoring atau load balancer.
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: toWIBString(new Date()) })
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
// Modul lain akan didaftarkan di sini seiring pengembangan:
// app.use('/user', require('./modules/user/user.route'))
// app.use('/quran', require('./modules/quran/quran.route'))

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' })
})

// ─── Global Error Handler ────────────────────────────────────
// HARUS dipasang paling terakhir dan punya 4 parameter (err, req, res, next)
app.use(errorHandler)

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`\n🕌 HAMIM Backend berjalan di http://localhost:${PORT}`)
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Health check: http://localhost:${PORT}/health\n`)

  // Cek & hapus permanen akun yang sudah 30 hari soft-deleted.
  // Jalan sekali saat startup, lalu berulang tiap 6 jam selama server hidup.
  const { startCleanupScheduler } = require('./utils/cleanupDeletedUsers')
  startCleanupScheduler()
})

module.exports = app