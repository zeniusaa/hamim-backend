const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const authService = require('../modules/auth/auth.service')

// Strategy Google OAuth dipanggil setiap kali user login via Google (flow web/browser).
// Logic cari/buat user-nya sekarang pakai findOrCreateGoogleUser di auth.service.js,
// yang sama persis dipakai oleh flow native (Flutter) — jadi tidak ada logic ganda.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await authService.findOrCreateGoogleUser({
          googleId: profile.id,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        })

        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

module.exports = passport