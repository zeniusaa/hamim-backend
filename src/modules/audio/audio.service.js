const { prisma } = require('../../config/database')
const livesService = require('../lives/lives.service')
const HttpError = require('../../utils/HttpError')
const { sanitizeQuestionForClient } = require('../quiz/quiz.service')

// ─── Helper: ambil KONTEKS 1 surah dalam SATU batch query ─────
// Semua data yang dibutuhkan untuk membangun kelompok audio+arabic+quiz
// diambil SEKALIGUS (surah, audio files, ayahs, quiz questions).
// Ini menghilangkan pola N+1 lama yang menjalankan 2 query PER kelompok
// (Al-Baqarah yang punya 57+ kelompok = 100+ query).
const loadSurahContext = async (surahId, languageId) => {
  const [surah, audioFiles, ayahs, quizQuestions] = await Promise.all([
    prisma.surah.findUnique({
      where: { id: surahId },
      select: {
        id: true,
        number: true,
        name_arabic: true,
        name_transliteration: true,
        total_ayah: true,
      },
    }),
    prisma.audioFile.findMany({
      where: { ayah: { surah_id: surahId } },
      orderBy: { audio_order: 'asc' },
      select: {
        id: true,
        audio_order: true,
        ayah_end_number: true,
        qari_name: true,
        file_url: true,
        duration_seconds: true,
        file_size_bytes: true,
        ayah: { select: { id: true, ayah_number: true } },
      },
    }),
    prisma.ayah.findMany({
      where: { surah_id: surahId },
      orderBy: { ayah_number: 'asc' },
      select: {
        id: true,
        ayah_number: true,
        text_uthmani: true,
        translation_id: true,
        transliteration: true,
      },
    }),
    prisma.quizQuestion.findMany({
      where: { ayah: { surah_id: surahId }, language_id: languageId },
      select: {
        id: true,
        ayah_id: true,
        question_text: true,
        options: {
          select: { id: true, option_text: true, order_index: true },
          orderBy: { order_index: 'asc' },
        },
      },
    }),
  ])

  if (!surah) throw new HttpError('Surah tidak ditemukan', 404, 'SURAH_NOT_FOUND')

  // Kelompokkan soal per ayah_id supaya lookup O(1) saat membangun grup
  const questionsByAyahId = new Map()
  for (const q of quizQuestions) {
    if (!questionsByAyahId.has(q.ayah_id)) questionsByAyahId.set(q.ayah_id, [])
    questionsByAyahId.get(q.ayah_id).push(q)
  }

  return { surah, audioFiles, ayahs, questionsByAyahId }
}

// ─── Helper: filter ayat dalam range 1 kelompok (dari list, tanpa query) ──
const filterAyahsInRange = (ayahs, startNumber, endNumber) => {
  return ayahs.filter((a) =>
    endNumber
      ? a.ayah_number >= startNumber && a.ayah_number <= endNumber
      : a.ayah_number === startNumber
  )
}

// ─── Helper: bangun payload 1 kelompok (audio + arabic + quiz) ──
// Semua data sudah ada di `ctx` (hasil loadSurahContext) — fungsi ini
// MURNI transformasi, tidak menyentuh database sama sekali.
const buildGroupPayload = (ctx, af) => {
  const ayahStartNumber = af.ayah.ayah_number
  const ayahEndNumber = af.ayah_end_number

  const ayahsInGroup = filterAyahsInRange(ctx.ayahs, ayahStartNumber, ayahEndNumber)
  const ayahIds = ayahsInGroup.map((a) => a.id)

  // Soal melengkapi ayat (drag_ayat) untuk semua ayat dalam kelompok ini.
  // Urutan option diacak + order_index disamarkan (lihat sanitizeQuestionForClient)
  // supaya kunci jawaban tidak bocor ke client.
  const quizQuestions = ayahIds.flatMap((id) => ctx.questionsByAyahId.get(id) || [])

  return {
    audio: {
      audio_id:         af.id,
      audio_order:      af.audio_order,
      qari_name:        af.qari_name,
      file_url:         af.file_url,
      duration_seconds: af.duration_seconds,
      file_size_bytes:  af.file_size_bytes,
    },
    ayah_start: ayahStartNumber,
    ayah_end:   ayahEndNumber ?? ayahStartNumber,
    ayah_count: ayahsInGroup.length,
    // Teks arab (uthmani), terjemahan, transliterasi per ayat dalam kelompok.
    ayahs: ayahsInGroup,
    quiz: {
      total_quiz: quizQuestions.length,
      questions:  quizQuestions.map(sanitizeQuestionForClient),
    },
  }
}

// ─── GET audio per surah → response per kelompok ─────────────
// Dipakai sebelum game dimulai (pre-load semua audio 1 surah).
// Response dikelompokkan per audio_file, bukan per ayat.
const getAudioBySurah = async (surahId) => {
  const ctx = await loadSurahContext(surahId)

  // Bangun response per kelompok audio
  // Setiap kelompok punya: info audio + list ayat yang diccover
  const audioGroups = ctx.audioFiles.map((af) => {
    const ayahStartNumber = af.ayah.ayah_number
    const ayahEndNumber   = af.ayah_end_number // bisa null

    const ayahsInGroup = filterAyahsInRange(ctx.ayahs, ayahStartNumber, ayahEndNumber)

    return {
      audio_id:        af.id,
      audio_order:     af.audio_order,
      qari_name:       af.qari_name,
      file_url:        af.file_url,
      duration_seconds: af.duration_seconds,
      file_size_bytes:  af.file_size_bytes,
      // Range ayat yang diccover audio ini
      ayah_start:      ayahStartNumber,
      ayah_end:        ayahEndNumber ?? ayahStartNumber, // kalau null = sama dengan start
      ayah_count:      ayahsInGroup.length,
      // Detail tiap ayat dalam kelompok
      ayahs:           ayahsInGroup,
    }
  })

  const total_duration_seconds = ctx.audioFiles.reduce(
    (acc, af) => acc + (af.duration_seconds ?? 0),
    0
  )

  return {
    surah: ctx.surah,
    total_audio_groups:      audioGroups.length,
    total_duration_seconds:  Math.round(total_duration_seconds),
    audio_groups:            audioGroups,
  }
}

// ─── GET audio per ayat ───────────────────────────────────────
// Dipakai saat user mau dengar 1 ayat spesifik.
// Cari audio yang ayah_start <= ayat ini <= ayah_end
// (1 ayat bisa masuk ke kelompok audio yang lebih besar)
const getAudioByAyah = async (ayahId) => {
  const ayah = await prisma.ayah.findUnique({
    where: { id: ayahId },
    select: {
      id: true,
      ayah_number: true,
      juz_number: true,
      text_uthmani: true,
      translation_id: true,
      transliteration: true,
      surah: {
        select: { id: true, number: true, name_transliteration: true },
      },
    },
  })
  if (!ayah) throw new HttpError('Ayat tidak ditemukan', 404, 'AYAH_NOT_FOUND')

  // Cari audio yang mengandung ayat ini LANGSUNG di query (bukan filter di JS):
  //   - audio 1 ayat: ayah_end_number IS NULL && start == ayah_number
  //   - audio kelompok: start <= ayah_number <= ayah_end_number
  // Sebelumnya semua audio 1 surah diambil dulu lalu difilter di JS — boros
  // kalau surahnya besar (Al-Baqarah = puluhan file audio).
  const surahAudioFiles = await prisma.audioFile.findMany({
    where: {
      ayah: { surah_id: ayah.surah.id },
      OR: [
        { ayah_end_number: null, ayah: { ayah_number: ayah.ayah_number } },
        {
          ayah: { ayah_number: { lte: ayah.ayah_number } },
          ayah_end_number: { gte: ayah.ayah_number },
        },
      ],
    },
    orderBy: { audio_order: 'asc' },
    select: {
      id: true,
      audio_order: true,
      ayah_end_number: true,
      qari_name: true,
      file_url: true,
      duration_seconds: true,
      file_size_bytes: true,
      ayah: { select: { ayah_number: true } },
    },
  })

  // Filter: audio yang range-nya mencakup ayah_number ini
  const matchingAudio = surahAudioFiles.filter((af) => {
    const start = af.ayah.ayah_number
    const end   = af.ayah_end_number ?? start
    return ayah.ayah_number >= start && ayah.ayah_number <= end
  })

  return {
    ayah: {
      id:             ayah.id,
      ayah_number:    ayah.ayah_number,
      juz_number:     ayah.juz_number,
      text_uthmani:   ayah.text_uthmani,
      translation_id: ayah.translation_id,
      transliteration: ayah.transliteration,
      surah:          ayah.surah,
    },
    // Biasanya hanya 1 audio, tapi return array untuk fleksibilitas
    audio_files: matchingAudio.map((af) => ({
      audio_id:        af.id,
      audio_order:     af.audio_order,
      ayah_start:      af.ayah.ayah_number,
      ayah_end:        af.ayah_end_number ?? af.ayah.ayah_number,
      qari_name:       af.qari_name,
      file_url:        af.file_url,
      duration_seconds: af.duration_seconds,
      file_size_bytes:  af.file_size_bytes,
    })),
  }
}

// ─── GET kelompok lengkap per surah: audio + arabic + quiz langsung ──
// Dipakai FE supaya 1x panggilan API dapat SEMUANYA untuk 1 kelompok ayat
// (audio, teks arab/terjemahan, dan soal kuis melengkapi ayat), tanpa perlu
// panggil /quiz/package terpisah. Pembagian kelompok SAMA PERSIS dengan
// kelompok audio (berdasarkan AudioFile.ayah_end_number) — idealnya tiap
// kelompok berisi 5 soal melengkapi ayat (drag_ayat).
// Sekalian disisipkan status nyawa user (sekarang cuma 1 nyawa, dipotong
// setelah user POST /quiz/group-attempt untuk kelompok tsb).
const getGroupsBySurah = async (surahId, userId, languageCode = 'id') => {
  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new HttpError('Bahasa tidak ditemukan', 404, 'LANGUAGE_NOT_FOUND')

  const [ctx, livesStatus] = await Promise.all([
    loadSurahContext(surahId, language.id),
    livesService.getStatus(userId),
  ])

  const groups = ctx.audioFiles.map((af) => buildGroupPayload(ctx, af))

  return {
    surah: ctx.surah,
    lives: livesStatus,
    total_groups: groups.length,
    groups,
  }
}

// ─── GET 1 kelompok ayat spesifik (misal cuma ayat 1-4 saja) ─────────
// Dipakai FE kalau cuma mau load/mulai 1 kelompok tertentu, bukan semua
// kelompok dalam 1 surat sekaligus. Cukup kasih 1 nomor ayat yang ADA DI
// DALAM kelompok itu (tidak harus tahu persis ayat_start-nya) — misal
// kelompoknya ayat 1-4, minta ayah_number=1, 2, 3, ATAU 4 sama-sama
// balikin kelompok yang sama.
const getGroupByAyahNumber = async (surahId, ayahNumber, userId, languageCode = 'id') => {
  const language = await prisma.language.findUnique({ where: { code: languageCode } })
  if (!language) throw new HttpError('Bahasa tidak ditemukan', 404, 'LANGUAGE_NOT_FOUND')

  const [ctx, livesStatus] = await Promise.all([
    loadSurahContext(surahId, language.id),
    livesService.getStatus(userId),
  ])

  const matchingAudio = ctx.audioFiles.find((af) => {
    const start = af.ayah.ayah_number
    const end   = af.ayah_end_number ?? start
    return ayahNumber >= start && ayahNumber <= end
  })
  if (!matchingAudio) throw new HttpError('Kelompok tidak ditemukan', 404, 'GROUP_NOT_FOUND')

  const group = buildGroupPayload(ctx, matchingAudio)

  return {
    surah: ctx.surah,
    lives: livesStatus,
    group,
  }
}

module.exports = { getAudioBySurah, getAudioByAyah, getGroupsBySurah, getGroupByAyahNumber }
