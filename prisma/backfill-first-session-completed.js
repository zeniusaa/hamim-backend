// One-off script — dijalankan SEKALI setelah migrasi `first_session_completed` di-deploy.
// Tandai `first_session_completed = true` untuk user yang sebelum migrasi ini sudah
// pernah punya quiz attempt (berarti secara de-facto sudah lewat First Session),
// supaya mereka tidak diarahkan balik ke halaman First Session oleh frontend.
// Lihat GitHub issue #8, bagian "Catatan untuk Backend".
//
//   node prisma/backfill-first-session-completed.js
//
require('dotenv').config()
const { prisma } = require('../src/config/database')

const backfillFirstSessionCompleted = async () => {
  const result = await prisma.user.updateMany({
    where: {
      first_session_completed: false,
      quiz_attempts: { some: {} },
    },
    data: { first_session_completed: true },
  })
  return result.count
}

backfillFirstSessionCompleted()
  .then((count) => {
    console.log(`Selesai. ${count} akun ditandai first_session_completed = true.`)
  })
  .catch((err) => {
    console.error('Gagal menjalankan backfill:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
