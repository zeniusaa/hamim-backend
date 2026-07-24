const { prisma } = require('../../config/database')

// Interval regen: 1 nyawa tiap 8 jam.
const REGEN_INTERVAL_MS = 8 * 60 * 60 * 1000

// Ambil (atau buat) row UserLives untuk user.
// Baru daftar / belum pernah main quiz => otomatis dikasih 3 nyawa penuh.
const getOrCreateLivesRow = async (userId) => {
  let row = await prisma.userLives.findUnique({ where: { user_id: userId } })
  if (!row) {
    row = await prisma.userLives.create({ data: { user_id: userId } })
  }
  return row
}

// Hitung ulang nyawa berdasarkan waktu berlalu sejak last_life_lost_at.
// Lazy calc: TIDAK butuh cron. Selalu dihitung dari selisih jam dinding,
// jadi tetap "jalan" walau user tidak buka aplikasi sama sekali.
//
// - Kalau nyawa sudah penuh / belum pernah kehilangan nyawa -> tidak ada yang dihitung.
// - Kalau elapsed >= 1 interval -> tambahkan sejumlah interval yang terlewati.
// - Kalau belum penuh setelah regen -> geser last_life_lost_at maju sejumlah interval yang
//   sudah "dicairkan", sisa waktu tetap berjalan menuju regen berikutnya (bukan direset ke 0).
// - Kalau sampai penuh -> last_life_lost_at dikosongkan (timer berhenti).
const computeRegen = (row, now = new Date()) => {
  if (row.current_lives >= row.max_lives || !row.last_life_lost_at) {
    return { current_lives: row.current_lives, last_life_lost_at: null, changed: false }
  }

  const elapsedMs = now.getTime() - row.last_life_lost_at.getTime()
  const regenCount = Math.floor(elapsedMs / REGEN_INTERVAL_MS)

  if (regenCount <= 0) {
    return { current_lives: row.current_lives, last_life_lost_at: row.last_life_lost_at, changed: false }
  }

  const newLives = Math.min(row.max_lives, row.current_lives + regenCount)

  if (newLives >= row.max_lives) {
    return { current_lives: row.max_lives, last_life_lost_at: null, changed: true }
  }

  const newLastLifeLostAt = new Date(row.last_life_lost_at.getTime() + regenCount * REGEN_INTERVAL_MS)
  return { current_lives: newLives, last_life_lost_at: newLastLifeLostAt, changed: true }
}

// Cek apakah status premium user masih berlaku.
// Kalau sudah kadaluarsa, otomatis "turunkan" jadi free (dibersihkan di DB juga).
const resolvePremium = async (row, now = new Date()) => {
  if (!row.is_premium) return row

  const stillActive = !row.premium_expires_at || row.premium_expires_at > now
  if (stillActive) return row

  return prisma.userLives.update({
    where: { user_id: row.user_id },
    data: { is_premium: false, premium_expires_at: null },
  })
}

// GET /lives — status nyawa saat ini (setelah lazy regen dihitung & disimpan)
const getStatus = async (userId) => {
  let row = await getOrCreateLivesRow(userId)
  row = await resolvePremium(row)

  if (row.is_premium) {
    return {
      is_premium: true,
      premium_expires_at: row.premium_expires_at,
      current_lives: null,
      max_lives: row.max_lives,
      unlimited: true,
      next_regen_at: null,
    }
  }

  const regen = computeRegen(row)
  if (regen.changed) {
    row = await prisma.userLives.update({
      where: { user_id: userId },
      data: { current_lives: regen.current_lives, last_life_lost_at: regen.last_life_lost_at },
    })
  }

  return {
    is_premium: false,
    premium_expires_at: null,
    current_lives: row.current_lives,
    max_lives: row.max_lives,
    unlimited: false,
    next_regen_at: row.last_life_lost_at
      ? new Date(row.last_life_lost_at.getTime() + REGEN_INTERVAL_MS)
      : null,
  }
}

// Dipanggil dari quiz.service saat user salah jawab.
// Melempar NO_LIVES_LEFT kalau nyawa user sudah habis dan bukan premium.
const consumeLife = async (userId) => {
  const status = await getStatus(userId)
  if (status.unlimited) return status
  if (status.current_lives <= 0) throw new Error('NO_LIVES_LEFT')

  const wasFull = status.current_lives === status.max_lives
  const updated = await prisma.userLives.update({
    where: { user_id: userId },
    data: {
      current_lives: { decrement: 1 },
      // Timer regen cuma dimulai ulang kalau sebelumnya nyawa masih penuh.
      // Kalau sudah dalam masa regen, timer yang sudah jalan tetap dipakai.
      last_life_lost_at: wasFull ? new Date() : undefined,
    },
  })

  return {
    is_premium: false,
    current_lives: updated.current_lives,
    max_lives: updated.max_lives,
    unlimited: false,
    next_regen_at: updated.last_life_lost_at
      ? new Date(updated.last_life_lost_at.getTime() + REGEN_INTERVAL_MS)
      : null,
  }
}

// Dipanggil sebelum quiz dimulai / submit — blokir kalau nyawa sudah habis & bukan premium.
const assertHasLives = async (userId) => {
  const status = await getStatus(userId)
  if (!status.unlimited && status.current_lives <= 0) throw new Error('NO_LIVES_LEFT')
  return status
}

// POST /lives/watch-ad — tambah 1 nyawa instan lewat iklan (tidak reset timer regen alami)
const addLifeFromAd = async (userId) => {
  let row = await getOrCreateLivesRow(userId)
  row = await resolvePremium(row)

  if (row.is_premium) {
    return { is_premium: true, unlimited: true, current_lives: null, max_lives: row.max_lives }
  }

  // Terapkan regen alami dulu sebelum nambah dari iklan, biar konsisten
  const regen = computeRegen(row)
  const baseLives = regen.changed ? regen.current_lives : row.current_lives
  const baseLastLifeLostAt = regen.changed ? regen.last_life_lost_at : row.last_life_lost_at

  if (baseLives >= row.max_lives) {
    return {
      is_premium: false,
      unlimited: false,
      current_lives: row.max_lives,
      max_lives: row.max_lives,
      added: false,
      message: 'Nyawa sudah penuh',
    }
  }

  const newLives = baseLives + 1
  const updated = await prisma.userLives.update({
    where: { user_id: userId },
    data: {
      current_lives: newLives,
      last_life_lost_at: newLives >= row.max_lives ? null : baseLastLifeLostAt,
    },
  })

  return {
    is_premium: false,
    unlimited: false,
    current_lives: updated.current_lives,
    max_lives: updated.max_lives,
    added: true,
  }
}

module.exports = { getStatus, consumeLife, assertHasLives, addLifeFromAd, REGEN_INTERVAL_MS }
