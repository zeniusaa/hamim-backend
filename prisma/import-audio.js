/**
 * HAMIM — Audio Import Script
 * ============================================================
 * Cara pakai:
 *   node prisma/import-audio.js --dir="C:/path/ke/folder/audio" --base-url="https://cdn.example.com/audio" --dry-run
 *   node prisma/import-audio.js --dir="C:/path/ke/folder/audio" --base-url="https://cdn.example.com/audio"
 *
 * Struktur folder yang diharapkan:
 *   audio/
 *     Al-Fatihah/       ← nama folder = nama surah (akan dicocokkan ke DB)
 *       1_1.mp3         ← audio ke-1, cover ayat 1
 *       2_2-3.mp3       ← audio ke-2, cover ayat 2 sampai 3
 *       3_4-6.mp3       ← dst
 *     Yasin/
 *       1_1-5.mp3
 *       ...
 *
 * Format nama file: {order}_{ayat_start}-{ayat_end}.mp3
 *                   {order}_{ayat}.mp3  (untuk 1 ayat)
 *
 * Opsi:
 *   --dir        Path ke folder root yang berisi subfolder per surah (wajib)
 *   --base-url   Base URL untuk file_url di DB, misal https://cdn.example.com/audio (wajib)
 *   --surah      Opsional: hanya proses surah tertentu, misal --surah="Al-Fatihah,Yasin"
 *   --dry-run    Tampilkan hasil parsing tanpa insert ke DB
 *   --clear      Hapus semua audio_files yang surahnya ada di folder ini sebelum insert ulang
 * ============================================================
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const prisma = require('./prisma-client') // lihat catatan di bawah

// ─── Parse CLI args ──────────────────────────────────────────
const args = {}
process.argv.slice(2).forEach((arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=')
  args[key] = val ?? true
})

const AUDIO_DIR  = args['dir']
const BASE_URL   = args['base-url']?.replace(/\/$/, '') // hapus trailing slash
const DRY_RUN    = args['dry-run'] === true || args['dry-run'] === 'true'
const CLEAR_FIRST = args['clear'] === true || args['clear'] === 'true'
const ONLY_SURAH = args['surah'] ? args['surah'].split(',').map((s) => s.trim()) : null

// Folder non-surah yang selalu diabaikan
const SKIP_FOLDERS = ['audio_hamim_english', 'ayat_kursi']

if (!AUDIO_DIR || !BASE_URL) {
  console.error('❌  --dir dan --base-url wajib diisi.')
  console.error('    Contoh: node prisma/import-audio.js --dir="./audio" --base-url="https://cdn.example.com/audio"')
  process.exit(1)
}

if (!fs.existsSync(AUDIO_DIR)) {
  console.error(`❌  Folder tidak ditemukan: ${AUDIO_DIR}`)
  process.exit(1)
}

// ─── Parse nama file ─────────────────────────────────────────
// Support berbagai format nama file:
//   {order}_{start}-{end}.mp3   → 1_1-4.mp3       (format utama, pakai underscore)
//   {order}_{start}.mp3         → 8_12.mp3         (1 ayat, pakai underscore)
//   {order}.{start}-{end}.mp3   → 1.1-4.mp3        (pakai titik)
//   {order}.{start}.mp3         → 16.28.mp3        (1 ayat, pakai titik)
//   Ayat{start}-{end}.mp3       → Ayat1-4.mp3      (tanpa order, auto-increment)
//   Ayat{start}.mp3             → Ayat12.mp3       (1 ayat, tanpa order)
//   Ayat-Gabung-{start}-{end}   → Ayat-Gabung-1-8  (gabungan, tanpa order)
//
// File dengan sub-ayat (22a, 1b) atau nama bebas (Al-Fatihah) → di-skip (return null)
//
// Untuk format tanpa order (Ayat*, Ayat-Gabung-*), order di-set 0 →
// script akan assign urutan berdasarkan ayah_start setelah semua file diparse.
function parseFileName(filename) {
  const name = path.basename(filename, '.mp3')

  // Format 1: {order}_{start}[-{end}]  (underscore)
  let m = name.match(/^(\d+)_(\d+)(?:-(\d+))?$/)
  if (m) return { audio_order: parseInt(m[1]), ayah_start: parseInt(m[2]), ayah_end: m[3] ? parseInt(m[3]) : null }

  // Format 2: {order}.{start}[-{end}]  (titik sebagai separator)
  m = name.match(/^(\d+)\.(\d+)(?:-(\d+))?$/)
  if (m) return { audio_order: parseInt(m[1]), ayah_start: parseInt(m[2]), ayah_end: m[3] ? parseInt(m[3]) : null }

  // Format 3: Ayat{start}[-{end}]  (tanpa order, case-insensitive)
  m = name.match(/^[Aa]yat(\d+)(?:-(\d+))?$/)
  if (m) return { audio_order: 0, ayah_start: parseInt(m[1]), ayah_end: m[2] ? parseInt(m[2]) : null }

  // Format 4: Ayat-Gabung-{start}-{end}  (gabungan tanpa order)
  m = name.match(/^[Aa]yat-[Gg]abung-(\d+)-(\d+)$/i)
  if (m) return { audio_order: 0, ayah_start: parseInt(m[1]), ayah_end: parseInt(m[2]) }

  // Format lain (sub-ayat, nama bebas) → skip
  return null
}


// ─── Cocokkan nama folder ke surah di DB ─────────────────────
// Support format: "1_alfatihah", "36_yasin", "58_al_mujadalah", dll
// Strategi utama: ekstrak nomor di depan lalu cocokkan surah.number
// Fallback: fuzzy match nama (strip semua non-huruf)
async function findSurah(folderName) {
  const candidates = await prisma.surah.findMany({
    select: { id: true, number: true, name_transliteration: true, name_translation_id: true },
  })

  // Strategi 1: format {nomor}_{nama} — pakai nomor surah (paling akurat)
  const m = folderName.match(/^(\d+)_/)
  if (m) {
    const num = parseInt(m[1])
    const found = candidates.find((s) => s.number === num)
    if (found) return found
  }

  // Strategi 2: fuzzy nama saja (strip semua non-huruf)
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
  const key  = norm(folderName)
  return candidates.find((s) =>
    norm(s.name_transliteration) === key ||
    norm(s.name_translation_id)  === key
  ) ?? null
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🎵  HAMIM Audio Import Script')
  console.log(`    Dir     : ${AUDIO_DIR}`)
  console.log(`    Base URL: ${BASE_URL}`)
  console.log(`    Mode    : ${DRY_RUN ? '🔍 DRY RUN (tidak ada yang disimpan)' : '💾 INSERT ke DB'}`)
  if (CLEAR_FIRST) console.log('    ⚠️   --clear aktif: audio lama akan dihapus dulu')
  console.log('')

  const surahFolders = fs
    .readdirSync(AUDIO_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !ONLY_SURAH || ONLY_SURAH.includes(name))

  if (surahFolders.length === 0) {
    console.warn('⚠️  Tidak ada subfolder ditemukan di', AUDIO_DIR)
    return
  }

  let totalInserted = 0
  let totalSkipped  = 0
  let totalError    = 0

  for (const folderName of surahFolders) {
    console.log(`\n📂  Folder: ${folderName}`)

    // Abaikan folder non-surah
    if (SKIP_FOLDERS.includes(folderName)) {
      console.log(`    ⏭️  Diabaikan (bukan surah)`)
      continue
    }

    // Cari surah di DB
    const surah = await findSurah(folderName)
    if (!surah) {
      console.error(`    ❌  Surah tidak ditemukan di DB untuk folder: "${folderName}"`)
      console.error(`        Pastikan nama folder sesuai dengan name_transliteration atau name_translation_id di tabel surahs.`)
      totalError++
      continue
    }
    console.log(`    ✅  Mapped ke: ${surah.name_transliteration} (Surah #${surah.number}, id=${surah.id})`)

    // Ambil semua ayat surah ini dari DB
    const ayahs = await prisma.ayah.findMany({
      where: { surah_id: surah.id },
      orderBy: { ayah_number: 'asc' },
      select: { id: true, ayah_number: true },
    })
    const ayahMap = Object.fromEntries(ayahs.map((a) => [a.ayah_number, a.id]))

    // Clear audio lama jika --clear
    if (CLEAR_FIRST && !DRY_RUN) {
      const deleted = await prisma.audioFile.deleteMany({
        where: { ayah: { surah_id: surah.id } },
      })
      if (deleted.count > 0) {
        console.log(`    🗑️   Hapus ${deleted.count} audio lama`)
      }
    }

    // Baca file MP3 di folder
    const folderPath = path.join(AUDIO_DIR, folderName)
    const mp3Files = fs
      .readdirSync(folderPath)
      .filter((f) => f.toLowerCase().endsWith('.mp3'))
      .sort() // sort alphabetically → 1_... 2_... dst

    if (mp3Files.length === 0) {
      console.warn(`    ⚠️  Tidak ada file .mp3 di folder ini`)
      continue
    }

    for (const filename of mp3Files) {
      const parsed = parseFileName(filename)

      if (!parsed) {
        console.warn(`    ⚠️  Skip (format tidak dikenali): ${filename}`)
        totalSkipped++
        continue
      }

      const { audio_order, ayah_start, ayah_end } = parsed

      // Cari ayah_id dari ayah_start
      const ayahId = ayahMap[ayah_start]
      if (!ayahId) {
        console.error(`    ❌  Ayat ${ayah_start} tidak ditemukan di DB untuk surah ini — file: ${filename}`)
        totalError++
        continue
      }

      // Validasi ayah_end jika ada
      if (ayah_end && !ayahMap[ayah_end]) {
        console.warn(`    ⚠️  Skip: ayat akhir ${ayah_end} tidak ada di DB — file: ${filename}`)
        totalSkipped++
        continue
      }

      // Validasi urutan
      if (ayah_end && ayah_end < ayah_start) {
        console.error(`    ❌  ayah_end (${ayah_end}) < ayah_start (${ayah_start}) — file: ${filename}`)
        totalError++
        continue
      }

      // Bangun file_url: BASE_URL/NamaFolder/namafile.mp3
      const file_url = `${BASE_URL}/${encodeURIComponent(folderName)}/${filename}`

      const rangeLabel = ayah_end ? `ayat ${ayah_start}–${ayah_end}` : `ayat ${ayah_start}`
      console.log(`    📄  ${filename} → order=${audio_order}, ${rangeLabel}, url=${file_url}`)

      if (!DRY_RUN) {
        await prisma.audioFile.create({
          data: {
            ayah_id:         ayahId,
            ayah_end_number: ayah_end ?? null,
            audio_order,
            qari_name:       'Maqdis',
            file_url,
          },
        })
      }

      totalInserted++
    }
  }

  console.log('\n─────────────────────────────────────────────')
  console.log(`✅  Selesai!`)
  console.log(`    ${DRY_RUN ? 'Akan diinsert' : 'Berhasil diinsert'} : ${totalInserted} audio`)
  console.log(`    Skip (format aneh) : ${totalSkipped}`)
  console.log(`    Error              : ${totalError}`)
  if (DRY_RUN) {
    console.log('\n💡  Ini DRY RUN — jalankan tanpa --dry-run untuk simpan ke DB.')
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error('💥  Fatal error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())