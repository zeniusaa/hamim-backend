// Script BANTU TESTING SAJA (bukan seed) — print ayah_id, question_id,
// dan option_id dari paket Al-Fatihah/Al-Ikhlas/Al-Falaq/An-Nas, biar
// gampang dipakai buat curl/Postman tanpa buka Prisma Studio manual.
//
//   node prisma/print-test-ids.js
//
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const bahasaId = await prisma.language.findUnique({ where: { code: 'id' } })

  const surahs = await prisma.surah.findMany({
    where: { number: { in: [1, 112, 113, 114] } },
    orderBy: { number: 'asc' },
  })

  for (const surah of surahs) {
    const ayahs = await prisma.ayah.findMany({
      where: { surah_id: surah.id },
      orderBy: { ayah_number: 'asc' },
      take: 1, // cukup 1 ayat contoh per surah buat testing cepat
    })

    for (const ayah of ayahs) {
      console.log(`\n=== ${surah.name_transliteration} ayat ${ayah.ayah_number} ===`)
      console.log(`ayah_id: ${ayah.id}`)

      const question = await prisma.quizQuestion.findFirst({
        where: { ayah_id: ayah.id, language_id: bahasaId.id, type: 'drag_ayat' },
        include: { options: { orderBy: { order_index: 'asc' } } },
      })
      if (!question) {
        console.log('  (belum ada soal — jalankan dulu: node prisma/seed-quiz-package.js)')
        continue
      }
      console.log(`question_id: ${question.id}`)
      console.log('  submitted_order (urutan benar):')
      question.options.forEach((o) => {
        console.log(`    order_index ${o.order_index}: option_id ${o.id}  (${o.option_text})`)
      })
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())