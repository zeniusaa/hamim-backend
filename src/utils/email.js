const nodemailer = require('nodemailer')

// Transporter dibuat sekali saja (lazy) dan dipakai ulang.
// Kalau env SMTP belum diisi (misal saat development awal),
// kita tidak bikin transporter beneran — supaya app tidak crash
// hanya karena belum setup SMTP.
let transporter = null

const isSmtpConfigured = () => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

const getTransporter = () => {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true untuk port 465, false untuk port lain (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

// sendResetPasswordEmail — kirim email berisi link reset password.
// Kalau SMTP belum dikonfigurasi (development), link cukup di-log ke
// console supaya developer tetap bisa testing flow tanpa setup SMTP dulu.
const sendResetPasswordEmail = async ({ to, resetLink }) => {
  if (!isSmtpConfigured()) {
    console.log('\n📧 [DEV] SMTP belum dikonfigurasi — link reset password:')
    console.log(`   To     : ${to}`)
    console.log(`   Link   : ${resetLink}\n`)
    return
  }

  const mailer = getTransporter()

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || 'HAMIM <no-reply@hamim.app>',
    to,
    subject: 'Reset Password — HAMIM',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset Password</h2>
        <p>Kami menerima permintaan untuk reset password akun HAMIM kamu.</p>
        <p>Klik tombol di bawah ini untuk membuat password baru. Link ini berlaku selama 1 jam.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}"
             style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p>Kalau kamu tidak merasa meminta ini, abaikan saja email ini — password kamu tidak akan berubah.</p>
      </div>
    `,
  })
}

module.exports = { sendResetPasswordEmail }