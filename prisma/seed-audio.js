/**
 * HAMIM — Import Audio dari tbl_surat.sql (data dari Maqdis Academy)
 * ============================================================
 * Sumber: dump SQL tabel `tbl_detail_surat1` (id_surat, jumlah_ayat_potong,
 * url_audio, url_video, tipe, poin). Sesuai arahan, script ini HANYA
 * mengambil 3 kolom: id_surat, jumlah_ayat_potong, url_audio — dan memakai
 * pengelompokan ayat (jumlah_ayat_potong) dari file ini sebagai PATOKAN
 * pemotongan audio per ayah_id / ayah_end_number di tabel AudioFile.
 *
 * PENTING — temuan dari file sumber (lihat juga ringkasan di chat):
 *   1. Kolom `id_surat` TIDAK selalu bisa dipercaya — sebagian baris berisi
 *      angka gabungan yang salah (mis. 6701, 7811, 7601) akibat duplikasi
 *      data. Script ini mengambil nomor surat yang BENAR dari folder di
 *      url_audio (pola "audio_surat/{nomor}_{namasurat}/...").
 *   2. Baris dengan id_surat=255 adalah "Ayat Kursi" (konten spesial,
 *      bukan surat biasa) — DI-SKIP, konsisten dengan SKIP_FOLDERS di
 *      import-audio.js.
 *   3. Baris dengan format ayat pecahan (mis. "20.1", "22a", "22b") —
 *      DI-SKIP, konsisten dengan konvensi skip sub-ayat di import-audio.js.
 *   4. File ini baru mencakup surat 1, 36, dan 58–114 (Juz 28–30). Surat
 *      lain (2–35, 37–57) belum ada datanya di file ini.
 *
 * Cara pakai:
 *   node prisma/seed-audio-maqdis.js --file="./prisma/tbl_surat.sql" --dry-run
 *   node prisma/seed-audio-maqdis.js --file="./prisma/tbl_surat.sql" --clear
 *
 * Opsi:
 *   --file       Path ke file .sql sumber (wajib)
 *   --dry-run    Cuma tampilkan hasil parsing, tidak insert ke DB
 *   --clear      Hapus dulu AudioFile qari_name='Maqdis' untuk surat yang
 *                ada di file ini, sebelum insert ulang (hindari duplikat
 *                kalau script dijalankan lebih dari 1x)
 *   --qari       Nama qari untuk kolom qari_name (default: "Maqdis")
 * ============================================================
 */

require('dotenv').config()
const fs = require('fs')
const prisma = require('./prisma-client')

// ─── Parse CLI args ──────────────────────────────────────────
const args = {}
process.argv.slice(2).forEach((arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=')
  args[key] = val ?? true
})

const SQL_FILE = args['file']
const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true'
const CLEAR_FIRST = args['clear'] === true || args['clear'] === 'true'
const QARI_NAME = args['qari'] || 'Maqdis'

if (!SQL_FILE) {
  console.error('❌  --file wajib diisi. Contoh:')
  console.error('    node prisma/seed-audio-maqdis.js --file="./prisma/tbl_surat.sql" --dry-run')
  process.exit(1)
}

if (!fs.existsSync(SQL_FILE)) {
  console.error(`❌  File tidak ditemukan: ${SQL_FILE}`)
  process.exit(1)
}

// ─── Regex parsing ───────────────────────────────────────────
// Ambil tuple (id_surat, jumlah_ayat_potong, url_audio, url_video, tipe, poin)
// dari statement INSERT ... VALUES (...), (...), ...;
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
      // format sub-ayat spt "20.1", "22a", "16-20.1" dll — belum didukung skema
      skippedSubAyat.push({ idSurat, rangeStr, urlAudio })
      continue
    }

    rows.push({ surahNumber, ayahStart, ayahEnd, urlAudio })
  }

  // ── Dedup exact (surahNumber, ayahStart, ayahEnd, urlAudio) ──
  // (mengatasi baris duplikat akibat id_surat yang salah/gabungan)
  const seen = new Set()
  const deduped = []
  for (const r of rows) {
    const key = `${r.surahNumber}|${r.ayahStart}|${r.ayahEnd}|${r.urlAudio}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(r)
  }

  return { rows: deduped, skippedAyatKursi, skippedSubAyat, skippedNoSurah, totalRaw: rows.length }
}

async function main() {
  console.log(`📄 Membaca ${SQL_FILE}...\n`)
  const { rows, skippedAyatKursi, skippedSubAyat, skippedNoSurah, totalRaw } = parseSqlFile(SQL_FILE)

  // Group per surah, urutan sesuai kemunculan di file (progresif: potongan kecil → gabungan)
  const bySurah = new Map()
  for (const r of rows) {
    if (!bySurah.has(r.surahNumber)) bySurah.set(r.surahNumber, [])
    bySurah.get(r.surahNumber).push(r)
  }

  console.log('📊 Ringkasan parsing:')
  console.log(`   Baris mentah cocok regex : ${totalRaw + skippedAyatKursi.length + skippedSubAyat.length + skippedNoSurah.length}`)
  console.log(`   Duplikat dibuang         : ${totalRaw - rows.length}`)
  console.log(`   Ayat Kursi (di-skip)     : ${skippedAyatKursi.length}`)
  console.log(`   Sub-ayat (di-skip)       : ${skippedSubAyat.length}`)
  console.log(`   Tanpa nomor surat di URL : ${skippedNoSurah.length}`)
  console.log(`   ✅ Baris valid dipakai   : ${rows.length}`)
  console.log(`   Surat tercakup           : ${bySurah.size} (${[...bySurah.keys()].sort((a, b) => a - b).join(', ')})\n`)

  if (skippedSubAyat.length) {
    console.log('⚠️  Contoh baris sub-ayat yang di-skip (butuh keputusan manual nanti):')
    skippedSubAyat.slice(0, 5).forEach((s) => console.log(`   surat ${s.idSurat}, ayat "${s.rangeStr}"`))
    console.log('')
  }

  if (DRY_RUN) {
    console.log('🔎 DRY RUN — contoh 10 baris pertama yang akan diproses:\n')
    rows.slice(0, 10).forEach((r) => {
      console.log(`   Surat ${r.surahNumber} | ayat ${r.ayahStart}-${r.ayahEnd} | ${r.urlAudio}`)
    })
    console.log('\n(Tidak ada perubahan ke database. Jalankan tanpa --dry-run untuk insert.)')
    return
  }

  let totalCreated = 0
  let totalMissingSurah = 0
  let totalMissingAyah = 0

  for (const [surahNumber, items] of bySurah) {
    const surah = await prisma.surah.findUnique({ where: { number: surahNumber } })
    if (!surah) {
      console.log(`   ⚠️  Surat nomor ${surahNumber} tidak ditemukan di DB (jalankan seed.js dulu) — dilewati`)
      totalMissingSurah += items.length
      continue
    }

    if (CLEAR_FIRST) {
      const ayahIds = await prisma.ayah.findMany({
        where: { surah_id: surah.id },
        select: { id: true },
      })
      await prisma.audioFile.deleteMany({
        where: { ayah_id: { in: ayahIds.map((a) => a.id) }, qari_name: QARI_NAME },
      })
    }

    let order = 1
    for (const item of items) {
      const ayah = await prisma.ayah.findUnique({
        where: { surah_id_ayah_number: { surah_id: surah.id, ayah_number: item.ayahStart } },
      })
      if (!ayah) {
        console.log(`   ⚠️  Ayah ${surahNumber}:${item.ayahStart} tidak ditemukan — dilewati`)
        totalMissingAyah++
        continue
      }

      await prisma.audioFile.create({
        data: {
          ayah_id: ayah.id,
          ayah_end_number: item.ayahEnd !== item.ayahStart ? item.ayahEnd : null,
          audio_order: order,
          qari_name: QARI_NAME,
          file_url: item.urlAudio,
        },
      })
      order++
      totalCreated++
    }

    process.stdout.write(`   Surat ${surahNumber} (${items.length} audio)...\r`)
  }

  console.log(`\n\n🎉 Selesai!`)
  console.log(`   Audio dibuat        : ${totalCreated}`)
  console.log(`   Surat tidak ada di DB: ${totalMissingSurah}`)
  console.log(`   Ayah tidak ditemukan : ${totalMissingAyah}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
