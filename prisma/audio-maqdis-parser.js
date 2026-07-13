/**
 * Parser untuk tbl_surat.sql (dump tabel tbl_detail_surat1 dari Maqdis
 * Academy). Lihat catatan lengkap di README lama seed-audio-maqdis.js —
 * ringkasannya:
 *   - id_surat di sumber TIDAK selalu bisa dipercaya -> nomor surat yang
 *     benar diambil dari folder di url_audio (audio_surat/{nomor}_...)
 *   - id_surat=255 (Ayat Kursi) di-skip
 *   - format ayat pecahan ("20.1", "22a", dst) di-skip
 */
const fs = require('fs')

const ROW_RE = /\((\d+),\s*'([^']*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*(\d+)\)/g
const URL_SURAH_RE = /audio_surat\/(\d+)_/
const RANGE_RE = /^(\d+)-(\d+)$/
const SINGLE_RE = /^(\d+)$/

function parseSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = []
  const skippedAyatKursi = []
  const skippedSubAyat = []
  const skippedNoSurah = []

  let m
  while ((m = ROW_RE.exec(content)) !== null) {
    const [, idSurat, rangeStr, urlAudioRaw] = m
    const urlAudio = urlAudioRaw.replace(/''/g, "'").trim()

    if (idSurat === '255') {
      skippedAyatKursi.push({ idSurat, rangeStr, urlAudio })
      continue
    }

    const surahMatch = URL_SURAH_RE.exec(urlAudio)
    if (!surahMatch) {
      skippedNoSurah.push({ idSurat, rangeStr, urlAudio })
      continue
    }
    const surahNumber = parseInt(surahMatch[1], 10)

    let ayahStart, ayahEnd
    const rangeMatch = RANGE_RE.exec(rangeStr)
    const singleMatch = SINGLE_RE.exec(rangeStr)
    if (rangeMatch) {
      ayahStart = parseInt(rangeMatch[1], 10)
      ayahEnd = parseInt(rangeMatch[2], 10)
    } else if (singleMatch) {
      ayahStart = ayahEnd = parseInt(singleMatch[1], 10)
    } else {
      skippedSubAyat.push({ idSurat, rangeStr, urlAudio })
      continue
    }

    rows.push({ surahNumber, ayahStart, ayahEnd, urlAudio })
  }

  // Dedup exact (surahNumber, ayahStart, ayahEnd, urlAudio)
  const seen = new Set()
  const deduped = []
  for (const r of rows) {
    const key = `${r.surahNumber}|${r.ayahStart}|${r.ayahEnd}|${r.urlAudio}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(r)
  }

  const bySurah = new Map()
  for (const r of deduped) {
    if (!bySurah.has(r.surahNumber)) bySurah.set(r.surahNumber, [])
    bySurah.get(r.surahNumber).push(r)
  }

  return {
    rows: deduped,
    bySurah,
    skippedAyatKursi,
    skippedSubAyat,
    skippedNoSurah,
    totalRaw: rows.length,
  }
}

module.exports = { parseSqlFile }
