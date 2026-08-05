// ============================================================
//  HAMIM — Seed Kuis "Susun/Lengkapi Ayat" (drag_ayat)
//  Surat: Al-'Asr, Al-Kautsar, Al-Ikhlas, Al-Falaq, An-Nas (Juz 30)
//
//  Jalankan SETELAH seed-languages.js dan seed.js:
//    node prisma/seed-languages.js
//    node prisma/seed.js
//    node prisma/seed-quiz-package.js          (kalau belum pernah)
//    node prisma/seed-quiz-drag-ayat-juz30.js
//
//  "Melengkapi ayat" DISATUKAN ke tipe drag_ayat yang sudah ada
//  (bukan tipe baru) — mekanismenya tetap sama seperti drag_ayat
//  lama (susun potongan kata jadi urutan yang benar), cuma
//  ditambah konteks 1-2 ayat sebelumnya di question_text kalau
//  ada, jadi lebih terasa seperti "melengkapi ayat" daripada
//  cuma "susun kata acak".
//
//  Idempotent terhadap drag_ayat yang SUDAH ADA: kalau sebuah ayat
//  (ayah_id + language) sudah punya soal drag_ayat — dari
//  seed-quiz-package.js sekalipun — otomatis di-skip, tidak dibuat
//  ulang/duplikat. Jadi script ini praktis cuma mengisi surat yang
//  belum ada soal drag_ayat-nya (Al-Kautsar & Al-'Asr), sementara
//  Al-Ikhlas/Al-Falaq/An-Nas yang sudah dibuat seed-quiz-package.js
//  otomatis dilewati.
//
//  Semua teks Arab diambil LANGSUNG dari text_uthmani di DB —
//  bukan ketikan manual — jadi dijamin sama persis dengan mushaf.
// ============================================================
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SURAH_NUMBERS = [103, 108, 112, 113, 114]
const SURAH_NAMES = {
  103: "Al-'Asr",
  108: 'Al-Kautsar',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
}

async function loadSurahData() {
  const result = []
  for (const number of SURAH_NUMBERS) {
    const surah = await prisma.surah.findUnique({ where: { number } })
    if (!surah) {
      console.log(`⚠️  Surah nomor ${number} (${SURAH_NAMES[number]}) tidak ditemukan — jalankan dulu: node prisma/seed.js`)
      continue
    }
    const ayahs = await prisma.ayah.findMany({
      where: { surah_id: surah.id },
      orderBy: { ayah_number: 'asc' },
    })
    result.push({ number, surah, ayahs })
  }
  return result
}

// Bagi rata jumlah ayat jadi 2 bagian (paruh awal & akhir) — dipakai
// cuma untuk pengelompokan log, tidak disimpan sebagai kolom DB.
function splitIntoParts(totalAyah) {
  return Math.ceil(totalAyah / 2)
}

const questionExists = (ayahId, languageId) =>
  prisma.quizQuestion.findFirst({ where: { ayah_id: ayahId, type: 'drag_ayat', language_id: languageId } })

async function createDragQuestion({ ayah, surahNumber, ayahNumber, contextAyat, languageId, lang }) {
  const existing = await questionExists(ayah.id, languageId)
  if (existing) return false

  const surahName = SURAH_NAMES[surahNumber]
  const words = ayah.text_uthmani.trim().split(/\s+/)

  let questionText
  if (contextAyat.length > 0) {
    const contextBlock = contextAyat.map((c) => `(${c.ayahNumber}) ${c.text}`).join('\n')
    const firstCtx = contextAyat[0].ayahNumber
    const lastCtx = contextAyat[contextAyat.length - 1].ayahNumber
    const ctxRange = firstCtx === lastCtx ? `${firstCtx}` : `${firstCtx}-${lastCtx}`
    questionText =
      lang === 'id'
        ? `Lengkapi ayat berikut dengan menyusun potongan kata yang tepat (QS. ${surahName} ayat ${ctxRange}):\n\n${contextBlock}\n\n(${ayahNumber}) .....`
        : `Complete the following verse by arranging the pieces correctly (QS. ${surahName}, ayah ${ctxRange}):\n\n${contextBlock}\n\n(${ayahNumber}) .....`
  } else {
    questionText =
      lang === 'id'
        ? `Susun kembali potongan ${surahName} ayat ${ayahNumber} sesuai urutan yang benar.`
        : `Rearrange the pieces of ${surahName} ayah ${ayahNumber} into the correct order.`
  }

  await prisma.quizQuestion.create({
    data: {
      ayah_id: ayah.id,
      type: 'drag_ayat',
      question_text: questionText,
      language_id: languageId,
      options: {
        create: words.map((w, i) => ({ option_text: w, is_correct: true, order_index: i })),
      },
    },
  })
  return true
}

async function main() {
  console.log("🌱 Seeding kuis susun/lengkapi ayat: Al-'Asr, Al-Kautsar, Al-Ikhlas, Al-Falaq, An-Nas...\n")

  const bahasaId = await prisma.language.findUnique({ where: { code: 'id' } })
  const bahasaEn = await prisma.language.findUnique({ where: { code: 'en' } })
  if (!bahasaId || !bahasaEn) {
    throw new Error('Data bahasa belum ada. Jalankan dulu: node prisma/seed-languages.js')
  }

  const surahDataList = await loadSurahData()

  let created = 0
  let skipped = 0

  for (const { number: surahNumber, ayahs } of surahDataList) {
    const part1End = splitIntoParts(ayahs.length)
    const partCounts = { 1: 0, 2: 0 }

    for (const ayah of ayahs) {
      const ayahNumber = ayah.ayah_number
      const contextCount = Math.min(2, ayahNumber - 1)
      const contextAyat = ayahs
        .filter((a) => a.ayah_number >= ayahNumber - contextCount && a.ayah_number < ayahNumber)
        .map((a) => ({ ayahNumber: a.ayah_number, text: a.text_uthmani }))

      const part = ayahNumber <= part1End ? 1 : 2

      const results = await Promise.all([
        createDragQuestion({ ayah, surahNumber, ayahNumber, contextAyat, languageId: bahasaId.id, lang: 'id' }),
        createDragQuestion({ ayah, surahNumber, ayahNumber, contextAyat, languageId: bahasaEn.id, lang: 'en' }),
      ])
      const madeCount = results.filter(Boolean).length
      created += madeCount
      skipped += results.filter((r) => !r).length
      partCounts[part] += madeCount
    }

    console.log(`✅ ${SURAH_NAMES[surahNumber]}: bagian 1 = ${partCounts[1]} soal baru, bagian 2 = ${partCounts[2]} soal baru`)
  }

  console.log('\n🎉 Selesai!')
  console.log(`   Soal baru dibuat : ${created}`)
  console.log(`   Sudah ada (skip) : ${skipped}`)
  console.log('\nCatatan: Al-Ikhlas/Al-Falaq/An-Nas kemungkinan besar semuanya ke-skip')
  console.log('(sudah dibuat seed-quiz-package.js tanpa konteks).')
}

main()
  .catch((e) => {
    console.error('❌ Seed kuis susun/lengkapi ayat gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
