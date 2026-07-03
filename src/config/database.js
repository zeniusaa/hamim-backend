const { PrismaClient } = require('@prisma/client')

// Satu instance PrismaClient untuk seluruh aplikasi.
// Membuat banyak instance berisiko menghabiskan koneksi database.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Export default (untuk: auth.service, auth.controller, passport)
// Export named (untuk: progress.service, audio.service, assets.service, level.service)
module.exports = prisma
module.exports.prisma = prisma