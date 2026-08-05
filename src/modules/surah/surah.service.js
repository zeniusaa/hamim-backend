const { prisma } = require('../../config/database')

// SERVICE = tempat business logic. Controller cuma terima request & kirim response.

// GET /surah?juz=<1-30>
// Kalau juzNumber tidak dikirim, balikin semua surat.
//
// PENTING: filter TIDAK pakai Surah.juz_start. Kolom itu cuma nyimpen juz
// TEMPAT SURAT ITU MULAI — surat yang lintas beberapa juz (misal Al-Baqarah
// yang mulai di juz 1 tapi lanjut sampai juz 3) tidak akan ketemu kalau
// dicari pakai juz_start = 3, padahal sebagian ayahnya memang ada di juz 3.
// Makanya filternya pakai Ayah.juz_number (data per-ayat, sudah akurat),
// lewat relasi `ayahs.some.juz_number`.
const getSurahs = async (juzNumber) => {
  const surahs = await prisma.surah.findMany({
    where: juzNumber
      ? { ayahs: { some: { juz_number: juzNumber } } }
      : undefined,
    select: {
      id: true,
      number: true,
      name_arabic: true,
      name_transliteration: true,
      name_translation_id: true,
      name_translation_en: true,
      juz_start: true,
      total_ayah: true,
      revelation_type: true,
      // Kalau lagi filter per-juz, sekalian ambil nomor ayah yang ada
      // di juz tersebut, supaya frontend tahu ayat berapa sampai berapa
      // dari surat ini yang termasuk juz yang diminta.
      ayahs: juzNumber
        ? {
            where: { juz_number: juzNumber },
            select: { ayah_number: true },
            orderBy: { ayah_number: 'asc' },
          }
        : false,
    },
    orderBy: { number: 'asc' },
  })

  if (!juzNumber) {
    return surahs
  }

  // Ubah daftar ayah mentah jadi ringkasan range (start/end/count) per surat,
  // lebih enak dipakai frontend daripada array nomor ayah satu-satu.
  return surahs.map(({ ayahs, ...surah }) => {
    const ayahNumbers = ayahs.map((a) => a.ayah_number)
    return {
      ...surah,
      ayah_range_in_juz: {
        start: ayahNumbers[0],
        end: ayahNumbers[ayahNumbers.length - 1],
        count: ayahNumbers.length,
      },
    }
  })
}

// GET /surah/:id/ayahs
// Ambil semua ayat dalam 1 surat, teks Arab saja (tanpa terjemahan/transliterasi)
const getArabicAyahsBySurah = async (surahId) => {
  const surah = await prisma.surah.findUnique({
    where: { id: surahId },
    select: {
      id: true,
      number: true,
      name_arabic: true,
      name_transliteration: true,
      total_ayah: true,
    },
  })
  if (!surah) throw new Error('SURAH_NOT_FOUND')

  const ayahs = await prisma.ayah.findMany({
    where: { surah_id: surahId },
    orderBy: { ayah_number: 'asc' },
    select: {
      id: true,
      ayah_number: true,
      text_uthmani: true,
    },
  })

  return { surah, ayahs }
}

module.exports = { getSurahs, getArabicAyahsBySurah }
