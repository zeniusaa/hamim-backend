// Prisma client untuk standalone scripts (import-audio, seed, dll)
// Terpisah dari src/config/database.js agar tidak ada dependency ke Express
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
