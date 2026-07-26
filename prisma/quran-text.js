/**
 * Ambil teks Arab Al-Quran (Utsmani + Imla'ei sederhana) dari api.quran.com,
 * lalu di-cache ke disk supaya seed berikutnya tidak perlu hit network lagi.
 *
 * Kenapa pakai endpoint BULK (bukan 1 request per ayat):
 *   - /quran/verses/uthmani dan /quran/verses/imlaei_simple masing-masing
 *     mengembalikan SELURUH 6236 ayat dalam 1 response.
 *   - Jadi total cuma 2 request buat seluruh Al-Quran, bukan 6236x2 request
 *     (yang pasti kena rate-limit / lama banget).
 *   - text_uthmani -> field `text_arabic`... err, dipakai untuk `teks_utsmani`
 *     (skrip mushaf, ada tanda waqaf/rasm khas Utsmani).
 *   - text_imlaei_simple -> dipakai untuk `teks_arab` (skrip Arab modern,
 *     tanpa tanda-tanda khusus mushaf — lebih gampang buat search/quiz).
 *
 * Kalau network gak tersedia (mis. server seed jalan offline / endpoint
 * down), fungsi ini return null map dan seed.js akan fallback ke placeholder
 * seperti sebelumnya — seed TIDAK gagal total karena ini.
 */
const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://api.quran.com/api/v4/quran/verses'
const CACHE_DIR = path.join(__dirname, 'data')

async function loadScript(scriptName, fieldName) {
  const cacheFile = path.join(CACHE_DIR, `quran-${scriptName}.json`)
  let verses

  if (fs.existsSync(cacheFile)) {
    verses = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
  } else {
    const res = await fetch(`${BASE_URL}/${scriptName}`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} saat fetch ${scriptName}`)
    }
    const json = await res.json()
    verses = json.verses
    if (!Array.isArray(verses) || verses.length === 0) {
      throw new Error(`Response ${scriptName} kosong / format tidak sesuai`)
    }
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify(verses))
  }

  const map = new Map()
  for (const v of verses) {
    map.set(v.verse_key, v[fieldName])
  }
  return map
}

/**
 * @returns {Promise<{uthmaniMap: Map|null, simpleMap: Map|null}>}
 */
async function loadQuranText() {
  try {
    const [uthmaniMap, simpleMap] = await Promise.all([
      loadScript('uthmani', 'text_uthmani'),
      loadScript('imlaei_simple', 'text_imlaei_simple'),
    ])
    return { uthmaniMap, simpleMap }
  } catch (err) {
    console.log(`   ⚠️  Gagal ambil teks Al-Quran dari api.quran.com: ${err.message}`)
    console.log('   ⚠️  Lanjut pakai placeholder teks (bisa dijalankan ulang nanti untuk isi teks asli).')
    return { uthmaniMap: null, simpleMap: null }
  }
}

module.exports = { loadQuranText }
