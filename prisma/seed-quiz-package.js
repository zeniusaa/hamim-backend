// ============================================================
//  HAMIM — Seed Paket Kuis: Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas
//  Jalankan SETELAH seed-languages.js dan seed.js
//    node prisma/seed-languages.js
//    node prisma/seed.js
//    node prisma/seed-quiz-package.js
//
//  Bikin soal untuk 4 surah pendek (22 ayat total) — 1 tipe soal per
//  ayat per bahasa (ID & EN):
//    - drag_ayat  : melengkapi ayat / drag and drop arabic, susun potongan
//                    kata ayat sesuai urutan. Kata-katanya diambil LANGSUNG
//                    dari text_uthmani yang sudah ada di DB (hasil seed.js
//                    dari api.quran.com) — bukan hasil ketikan manual, jadi
//                    dijamin sama persis dengan mushaf. Ini SATU-SATUNYA
//                    tipe kuis yang tersisa (multiple_choice sudah dihapus).
//
//  Idempotent: kalau kombinasi ayah + type + language sudah ada soalnya
//  (misal dari seed-dummy.js), akan di-skip, bukan bikin duplikat.
// ============================================================
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Terjemahan per ayat (ringkas, makna umum yang disepakati) ───
// Struktur: { [nomor_surah]: { [nomor_ayat]: { id, en } } }
const MEANINGS = {
  1: {
    // Al-Fatihah
    1: { id: 'Dengan menyebut nama Allah Yang Maha Pengasih, Maha Penyayang', en: 'In the name of Allah, the Most Gracious, the Most Merciful' },
    2: { id: 'Segala puji bagi Allah, Tuhan seluruh alam', en: 'All praise is for Allah, Lord of all the worlds' },
    3: { id: 'Yang Maha Pengasih, Maha Penyayang', en: 'The Most Gracious, the Most Merciful' },
    4: { id: 'Yang menguasai hari pembalasan', en: 'Master of the Day of Judgment' },
    5: { id: 'Hanya kepada-Mu kami menyembah, dan hanya kepada-Mu kami memohon pertolongan', en: 'You alone we worship, and You alone we ask for help' },
    6: { id: 'Tunjukilah kami jalan yang lurus', en: 'Guide us to the straight path' },
    7: {
      id: 'Yaitu jalan orang-orang yang telah Engkau beri nikmat, bukan jalan orang yang dimurkai dan bukan pula jalan orang yang sesat',
      en: 'The path of those You have blessed, not of those who earned Your anger, nor of those who went astray',
    },
  },
  112: {
    // Al-Ikhlas
    1: { id: 'Katakanlah: Dialah Allah, Yang Maha Esa', en: 'Say: He is Allah, the One' },
    2: { id: 'Allah tempat bergantung segala sesuatu', en: 'Allah, the Eternal Refuge to whom all depend' },
    3: { id: 'Dia tidak beranak dan tidak pula diperanakkan', en: 'He neither begets nor is born' },
    4: { id: 'Dan tidak ada satu pun yang setara dengan-Nya', en: 'And there is none equal to Him' },
  },
  113: {
    // Al-Falaq
    1: { id: 'Katakanlah: Aku berlindung kepada Tuhan yang menguasai waktu subuh', en: 'Say: I seek refuge in the Lord of the daybreak' },
    2: { id: 'Dari kejahatan makhluk yang Dia ciptakan', en: 'From the evil of what He created' },
    3: { id: 'Dan dari kejahatan malam apabila telah gelap gulita', en: 'And from the evil of darkness when it settles' },
    4: { id: 'Dan dari kejahatan tukang sihir yang meniup pada buhul-buhul tali', en: 'And from the evil of those who blow on knots, practicing magic' },
    5: { id: 'Dan dari kejahatan orang yang dengki apabila ia dengki', en: 'And from the evil of an envier when he envies' },
  },
  114: {
    // An-Nas
    1: { id: 'Katakanlah: Aku berlindung kepada Tuhan pemelihara manusia', en: 'Say: I seek refuge in the Lord of mankind' },
    2: { id: 'Raja manusia', en: 'The King of mankind' },
    3: { id: 'Sembahan yang berhak disembah manusia', en: 'The God of mankind' },
    4: { id: 'Dari kejahatan bisikan setan yang bersembunyi', en: 'From the evil of the retreating whisperer' },
    5: { id: 'Yang membisikkan kejahatan ke dalam dada manusia', en: 'Who whispers into the hearts of mankind' },
    6: { id: 'Dari golongan jin dan manusia', en: 'From among the jinn and mankind' },
  },
}

const SURAH_NAMES = { 1: 'Al-Fatihah', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas' }

const questionExists = (ayahId, type, languageId) =>
  prisma.quizQuestion.findFirst({ where: { ayah_id: ayahId, type, language_id: languageId } })

async function createDragQuestion(ayah, surahNumber, ayahNumber, languageId, lang) {
  const existing = await questionExists(ayah.id, 'drag_ayat', languageId)
  if (existing) return false

  const words = ayah.text_uthmani.trim().split(/\s+/)
  const questionText =
    lang === 'id'
      ? `Susun kembali potongan ${SURAH_NAMES[surahNumber]} ayat ${ayahNumber} sesuai urutan yang benar.`
      : `Rearrange the pieces of ${SURAH_NAMES[surahNumber]} ayah ${ayahNumber} into the correct order.`

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
  console.log('🌱 Seeding paket kuis: Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas...\n')

  const bahasaId = await prisma.language.findUnique({ where: { code: 'id' } })
  const bahasaEn = await prisma.language.findUnique({ where: { code: 'en' } })
  if (!bahasaId || !bahasaEn) {
    throw new Error('Data bahasa belum ada. Jalankan dulu: node prisma/seed-languages.js')
  }

  let created = 0
  let skipped = 0

  for (const surahNumberStr of Object.keys(MEANINGS)) {
    const surahNumber = Number(surahNumberStr)
    const surah = await prisma.surah.findUnique({ where: { number: surahNumber } })
    if (!surah) {
      console.log(`⚠️  Surah nomor ${surahNumber} tidak ditemukan — jalankan dulu: node prisma/seed.js`)
      continue
    }

    for (const ayahNumberStr of Object.keys(MEANINGS[surahNumber])) {
      const ayahNumber = Number(ayahNumberStr)
      const ayah = await prisma.ayah.findUnique({
        where: { surah_id_ayah_number: { surah_id: surah.id, ayah_number: ayahNumber } },
      })
      if (!ayah) {
        console.log(`⚠️  ${SURAH_NAMES[surahNumber]} ayat ${ayahNumber} tidak ditemukan di DB — skip.`)
        continue
      }

      const results = await Promise.all([
        createDragQuestion(ayah, surahNumber, ayahNumber, bahasaId.id, 'id'),
        createDragQuestion(ayah, surahNumber, ayahNumber, bahasaEn.id, 'en'),
      ])
      created += results.filter(Boolean).length
      skipped += results.filter((r) => !r).length

      process.stdout.write(`   ${SURAH_NAMES[surahNumber]} ayat ${ayahNumber}...\r`)
    }
    console.log(`✅ ${SURAH_NAMES[surahNumber]} selesai                                  `)
  }

  console.log('\n🎉 Selesai!')
  console.log(`   Soal baru dibuat : ${created}`)
  console.log(`   Sudah ada (skip) : ${skipped}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed paket kuis gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
