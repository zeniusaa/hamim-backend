const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const prisma = require('./database')

// Strategy Google OAuth dipanggil setiap kali user login via Google.
// Alur:
//   1. Cek apakah google_id sudah ada di DB → return user
//   2. Kalau belum, cek apakah email sudah terdaftar → link google_id ke akun lama
//   3. Kalau email juga baru → buat akun baru otomatis
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value

        // Sudah pernah login Google?
        let user = await prisma.user.findUnique({
          where: { google_id: profile.id },
        })
        if (user) return done(null, user)

        // Email sudah ada (akun email/password)?
        user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          user = await prisma.user.update({
            where: { email },
            data: { google_id: profile.id },
          })
          return done(null, user)
        }

        // Buat akun baru
        user = await prisma.user.create({
          data: {
            email,
            google_id: profile.id,
            profile: {
              create: {
                display_name: profile.displayName,
                avatar_url: profile.photos?.[0]?.value ?? null,
              },
            },
          },
        })

        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

module.exports = passport
