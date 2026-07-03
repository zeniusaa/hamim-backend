// ============================================================
//  HAMIM — Seed Language
//  Jalankan sekali: node prisma/seed-languages.js
//  Mengisi table `languages` untuk layar "pilih bahasa" di awal app
// ============================================================
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'en', name: 'English' },
]

async function main() {
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    })
  }
  console.log('✅ Seed languages selesai:', LANGUAGES.map((l) => l.code).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
