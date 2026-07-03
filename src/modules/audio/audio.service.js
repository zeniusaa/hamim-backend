const { prisma } = require('../../config/database')

// ─── Helper: bangun info ayat dalam 1 kelompok audio ─────────
// Dari audio yang punya ayah_start + ayah_end_number,
// kita ambil semua ayat dalam range itu dari DB.
const buildAyahGroup = async (surahId, ayahStartNumber, ayahEndNumber) => {
  const where = {
    surah_id: surahId,
    ayah_number: ayahEndNumber
      ? { gte: ayahStartNumber, lte: ayahEndNumber }
      : ayahStartNumber,
  }

  const ayahs = await prisma.ayah.findMany({
    where,
    orderBy: { ayah_number: 'asc' },
    select: {
      id: true,
      ayah_number: true,
      text_uthmani: true,
      translation_id: true,
      transliteration: true,
    },
  })

  return ayahs
}

// ─── GET audio per surah → response per kelompok ─────────────
// Dipakai sebelum game dimulai (pre-load semua audio 1 surah).
// Response dikelompokkan per audio_file, bukan per ayat.
const getAudioBySurah = async (surahId) => {
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

  // Ambil semua audio surah ini, diurutkan berdasarkan audio_order
  // ayah_id = FK ke ayah pertama dalam kelompok
  const audioFiles = await prisma.audioFile.findMany({
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
      ayah: {
        select: {
          id: true,
          ayah_number: true,
        },
      },
    },
  })

  // Bangun response per kelompok audio
  // Setiap kelompok punya: info audio + list ayat yang diccover
  const audioGroups = await Promise.all(
    audioFiles.map(async (af) => {
      const ayahStartNumber = af.ayah.ayah_number
      const ayahEndNumber   = af.ayah_end_number // bisa null

      const ayahsInGroup = await buildAyahGroup(surahId, ayahStartNumber, ayahEndNumber)

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
  )

  const total_duration_seconds = audioFiles.reduce(
    (acc, af) => acc + (af.duration_seconds ?? 0),
    0
  )

  return {
    surah,
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
  if (!ayah) throw new Error('AYAH_NOT_FOUND')

  // Cari audio yang mengandung ayat ini:
  // - 1 ayat: ayah_id = ayahId dan ayah_end_number IS NULL
  // - kelompok: ayah.ayah_number <= ayah ini <= ayah_end_number
  // Kita query semua audio surah ini lalu filter di JS
  // (lebih simpel daripada raw query dengan kondisi range)
  const surahAudioFiles = await prisma.audioFile.findMany({
    where: { ayah: { surah_id: ayah.surah.id } },
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

module.exports = { getAudioBySurah, getAudioByAyah }
