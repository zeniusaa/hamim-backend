const { prisma } = require('../config/database')

const RETENTION_DAYS = 30
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

// Hapus PERMANEN semua user yang deleted_at-nya sudah lewat 30 hari.
// Data turunan (profile, progress, quiz_attempts, lives, dll) ikut terhapus
// otomatis karena relasinya onDelete: Cascade di schema.
// Dipanggil dari 2 tempat:
//   1. Scheduler otomatis di app.js (jalan tiap kali server hidup)
//   2. Manual/cron: `node prisma/cleanup-deleted-users.js`
const cleanupDeletedUsers = async () => {
  const cutoff = new Date(Date.now() - RETENTION_MS)

  const result = await prisma.user.deleteMany({
    where: { deleted_at: { lte: cutoff } },
  })

  if (result.count > 0) {
    console.log(`[cleanupDeletedUsers] ${result.count} akun dihapus permanen (sudah lewat ${RETENTION_DAYS} hari).`)
  }

  return result.count
}

// Jalankan pengecekan tiap `intervalMs` (default 6 jam) selama app hidup.
// Ini pengganti cron OS-level — cukup untuk backend yang proses-nya nyala terus
// (npm start / pm2 / dsb). Kalau server sempat mati beberapa hari, begitu nyala
// lagi langsung dicek ulang (jalan sekali di awal juga), jadi tidak ada yang kelewat.
const startCleanupScheduler = (intervalMs = 6 * 60 * 60 * 1000) => {
  cleanupDeletedUsers().catch((err) => console.error('[cleanupDeletedUsers] gagal:', err.message))

  const timer = setInterval(() => {
    cleanupDeletedUsers().catch((err) => console.error('[cleanupDeletedUsers] gagal:', err.message))
  }, intervalMs)

  // Jangan sampai timer ini bikin proses Node "menggantung" pas mau dimatikan
  timer.unref?.()

  return timer
}

module.exports = { cleanupDeletedUsers, startCleanupScheduler, RETENTION_DAYS }
