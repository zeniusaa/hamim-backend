const jwt = require('jsonwebtoken')

// generateTokens — membuat sepasang token:
//   - accessToken  : masa pendek (7 hari), dipakai untuk request API
//   - refreshToken : masa panjang (30 hari), dipakai untuk minta accessToken baru
//
// Kenapa dua token? Kalau hanya satu token masa panjang, jika dicuri
// penyerang bisa pakai selamanya. Dengan dua token, accessToken pendek
// membatasi dampak kebocoran.
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
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
