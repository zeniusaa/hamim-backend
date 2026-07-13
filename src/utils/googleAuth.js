const { OAuth2Client } = require('google-auth-library')

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Verifikasi ID token yang dikirim dari Flutter (hasil google_sign_in SDK).
// Ini BUKAN access token biasa — ini JWT yang ditandatangani Google,
// jadi kita bisa cek keasliannya tanpa perlu call API Google lagi.
const verifyGoogleIdToken = async (idToken) => {
  let ticket
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
  } catch (err) {
    const error = new Error('Token Google tidak valid atau sudah kedaluwarsa.')
    error.statusCode = 401
    throw error
  }

  const payload = ticket.getPayload()

  if (!payload?.email) {
    const err = new Error('Token Google tidak valid.')
    err.statusCode = 401
    throw err
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    displayName: payload.name,
    avatarUrl: payload.picture,
  }
}

module.exports = { verifyGoogleIdToken }