const { z } = require('zod')
const profileService = require('./profile.service')
const { success, error } = require('../../utils/response')

// Cuma 5 pilihan ini yang boleh dikirim client — sesuai desain UI
// (tombol pilihan 5/10/15/20/30 menit, bukan input bebas)
const ALLOWED_DAILY_TARGETS = [5, 10, 15, 20, 30]

const onboardingSchema = z.object({
  avatar_url: z.string().url('URL avatar tidak valid.').optional(),

  // Cuma dipakai kalau user daftar via Google dan belum punya nomor HP tersimpan
  phone_number: z
    .string()
    .min(8, 'Nomor HP/WA tidak valid.')
    .max(20, 'Nomor HP/WA terlalu panjang.')
    .optional(),

  learning_start: z.enum(['juz_awal', 'juz_akhir'], {
    errorMap: () => ({ message: 'Pilih juz_awal atau juz_akhir.' }),
  }),

  referral_source: z.string().max(100, 'Terlalu panjang.').optional(),
  motivation_text: z.string().max(500, 'Terlalu panjang.').optional(),

  daily_target_minutes: z
    .number()
    .refine((v) => ALLOWED_DAILY_TARGETS.includes(v), {
      message: `Target harian harus salah satu dari: ${ALLOWED_DAILY_TARGETS.join(', ')} menit.`,
    }),

  audio_repeat_count: z
    .number()
    .int('Harus bilangan bulat.')
    .min(1, 'Minimal 1x putaran.')
    .max(10, 'Maksimal 10x putaran.'),
})

// PATCH /profile/onboarding
const completeOnboarding = async (req, res, next) => {
  try {
    const data = onboardingSchema.parse(req.body)
    const profile = await profileService.completeOnboarding(req.user.id, data)

    return success(res, 'Profil berhasil dilengkapi.', profile)
  } catch (err) {
    next(err)
  }
}

// GET /profile/me
const me = async (req, res, next) => {
  try {
    const user = await profileService.getMyProfile(req.user.id)
    if (!user) return error(res, 'User tidak ditemukan.', 404)

    return success(res, 'Profil berhasil diambil.', user)
  } catch (err) {
    next(err)
  }
}

module.exports = { completeOnboarding, me }
