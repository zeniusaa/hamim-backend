const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// generateTokens — membuat sepasang token:
//   - accessToken  : masa pendek (7 hari), dipakai untuk request API
//   - refreshToken : masa panjang (30 hari), dipakai untuk minta accessToken baru
//
// Kenapa dua token? Kalau hanya satu token masa panjang, jika dicuri
// penyerang bisa pakai selamanya. Dengan dua token, accessToken pendek
// membatasi dampak kebocoran.
//
// PENTING (jti): setiap token diberi `jti` acak. Tanpa ini, dua pemanggilan
// dalam detik yang sama dengan payload sama menghasilkan token IDENTIK
// (jsonwebtoken menghitung iat dalam satuan detik) — yang merusak rotasi
// refresh token: token "baru" hasil rotasi bisa sama persis dengan token
// lama, jadi token lama tidak pernah benar-benar mati.
const generateTokens = (payload) => {
  const jti = crypto.randomUUID()

  const accessToken = jwt.sign({ ...payload, jti }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

  const refreshToken = jwt.sign({ ...payload, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  })

  return { accessToken, refreshToken }
}

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
}

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken }
