// Jalankan manual atau lewat cron/task scheduler eksternal kalau tidak mau
// mengandalkan scheduler internal di app.js (misal server sering di-restart,
// atau mau dipisah jadi cron job terpisah di hosting/VPS):
//
//   node prisma/cleanup-deleted-users.js
//
require('dotenv').config()
const { prisma } = require('../src/config/database')
const { cleanupDeletedUsers } = require('../src/utils/cleanupDeletedUsers')

cleanupDeletedUsers()
  .then((count) => {
    console.log(`Selesai. ${count} akun dihapus permanen.`)
  })
  .catch((err) => {
    console.error('Gagal menjalankan cleanup:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
