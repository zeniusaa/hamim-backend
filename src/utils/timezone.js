// Semua waktu tetap DISIMPAN sebagai UTC di database (best practice, JS Date
// juga selalu internal UTC) — yang diubah cuma tampilannya waktu dikirim ke
// client lewat JSON, supaya yang dibaca tim mobile/frontend selalu WIB
// (Asia/Jakarta, UTC+7), bukan UTC.
//
// Cara pakai: cukup di-require sekali di app.js paling atas (side-effect import).
// Setelah itu SEMUA res.json(...) yang mengandung objek Date (langsung dari
// Prisma ataupun `new Date()`) otomatis keluar dalam format WIB, tanpa perlu
// ubah satu-satu di tiap controller/service.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7, tidak ada DST di Indonesia

const pad = (num, len = 2) => String(num).padStart(len, '0')

// Format: "2026-07-24T14:30:00.123+07:00"
const toWIBString = (date) => {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS)
  const yyyy = wib.getUTCFullYear()
  const mm = pad(wib.getUTCMonth() + 1)
  const dd = pad(wib.getUTCDate())
  const hh = pad(wib.getUTCHours())
  const mi = pad(wib.getUTCMinutes())
  const ss = pad(wib.getUTCSeconds())
  const ms = pad(wib.getUTCMilliseconds(), 3)
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}+07:00`
}

// Override toJSON (dipanggil otomatis oleh JSON.stringify / res.json() untuk
// tiap objek Date) supaya hasilnya WIB, bukan default toISOString() (UTC/"Z").
// Tidak mengubah cara Date disimpan/dihitung di Prisma atau di JS — cuma
// representasi string-nya saat diserialisasi ke JSON.
Date.prototype.toJSON = function () {
  return toWIBString(this)
}

module.exports = { toWIBString, WIB_OFFSET_MS }
