const { z } = require('zod')
const adminService = require('./admin.service')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

// CONTROLLER = jembatan HTTP ↔ service. Validasi input + kirim response,
// logika bisnis tetap di service. Semua handler dibungkus asyncHandler
// (gaya konsisten seluruh project: error otomatis di-pass ke errorHandler).

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Password tidak boleh kosong.'),
})

const listUsersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['USER', 'ADMIN']).optional(),
  premium: z.enum(['true', 'false']).optional(),
})

const premiumSchema = z.object({
  is_premium: z.boolean(),
  // Opsional: kalau diisi, premium aktif selama N hari; kalau kosong + true = permanen
  duration_days: z.number().int().min(1).optional(),
})

const resetLivesSchema = z.object({
  current_lives: z.number().int().min(0).max(100).optional(),
})

// ─── Fase 2: validasi konten ───
const listContentSchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const surahSchema = z.object({
  number: z.number().int().min(1).max(114, 'Nomor surah 1-114.'),
  name_arabic: z.string().min(1, 'Nama arab wajib diisi.').max(100),
  name_transliteration: z.string().min(1, 'Nama transliterasi wajib diisi.').max(100),
  name_translation_id: z.string().min(1, 'Terjemahan nama (ID) wajib diisi.').max(100),
  name_translation_en: z.string().min(1, 'Terjemahan nama (EN) wajib diisi.').max(100),
  juz_start: z.number().int().min(1).max(30),
  total_ayah: z.number().int().min(1).max(300),
  revelation_type: z.enum(['makkiyah', 'madaniyah']),
})

const surahUpdateSchema = surahSchema.partial()

const ayahSchema = z.object({
  ayah_number: z.number().int().min(1).max(300),
  juz_number: z.number().int().min(1).max(30),
  text_arabic: z.string().min(1, 'Teks arab wajib diisi.'),
  text_uthmani: z.string().min(1, 'Teks uthmani wajib diisi.'),
  translation_id: z.string().optional(),
  translation_en: z.string().optional(),
  transliteration: z.string().optional(),
})

const ayahUpdateSchema = ayahSchema.partial()

const questionOptionSchema = z.object({
  option_text: z.string().min(1, 'Teks opsi wajib diisi.'),
  is_correct: z.boolean(),
  order_index: z.number().int().min(0).default(0),
})

const createQuestionSchema = z.object({
  type: z.enum(['drag_ayat']).default('drag_ayat'),
  question_text: z.string().min(1, 'Teks soal wajib diisi.'),
  language_id: z.string().min(1, 'language_id wajib diisi.'),
  options: z.array(questionOptionSchema).min(2, 'Minimal 2 opsi.'),
})

const updateQuestionSchema = z.object({
  question_text: z.string().min(1).optional(),
  language_id: z.string().min(1).optional(),
  options: z.array(questionOptionSchema).min(2).optional(),
})

// ─── Fase 3: validasi analytics ───
const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
})

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// POST /admin/login
const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body)
  const result = await adminService.login(data)
  return success(res, 'Login admin berhasil.', result)
})

// GET /admin/me
const me = asyncHandler(async (req, res) => {
  const admin = await adminService.me(req.user.id)
  return success(res, 'Data admin.', admin)
})

// GET /admin/users
const listUsers = asyncHandler(async (req, res) => {
  const query = listUsersSchema.parse(req.query)
  const data = await adminService.listUsers(query)
  return success(res, 'Daftar user.', data)
})

// GET /admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const data = await adminService.getUser(req.params.id)
  return success(res, 'Detail user.', data)
})

// PATCH /admin/users/:id/premium
const setPremium = asyncHandler(async (req, res) => {
  const data = premiumSchema.parse(req.body)
  const result = await adminService.setPremium(req.params.id, data)
  return success(res, 'Status premium diperbarui.', result)
})

// PATCH /admin/users/:id/lives
const resetLives = asyncHandler(async (req, res) => {
  const data = resetLivesSchema.parse(req.body)
  const result = await adminService.resetLives(req.params.id, data)
  return success(res, 'Nyawa user direset.', result)
})

// DELETE /admin/users/:id — nonaktifkan (soft delete)
const softDeleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.softDeleteUser(req.user.id, req.params.id)
  return success(res, 'User dinonaktifkan.', result)
})

// POST /admin/users/:id/restore
const restoreUser = asyncHandler(async (req, res) => {
  const result = await adminService.restoreUser(req.params.id)
  return success(res, 'User dipulihkan.', result)
})

// POST /admin/users/:id/reset-progress
const resetProgress = asyncHandler(async (req, res) => {
  const result = await adminService.resetProgress(req.params.id)
  return success(res, 'Progress belajar user direset.', result)
})

// ─── Fase 2: Surah ───
const listSurahs = asyncHandler(async (req, res) => {
  const query = listContentSchema.parse(req.query)
  const data = await adminService.listSurahs(query)
  return success(res, 'Daftar surah.', data)
})

const getSurah = asyncHandler(async (req, res) => {
  const data = await adminService.getSurah(req.params.id)
  return success(res, 'Detail surah.', data)
})

const createSurah = asyncHandler(async (req, res) => {
  const data = surahSchema.parse(req.body)
  const result = await adminService.createSurah(data)
  return success(res, 'Surah dibuat.', result, 201)
})

const updateSurah = asyncHandler(async (req, res) => {
  const data = surahUpdateSchema.parse(req.body)
  const result = await adminService.updateSurah(req.params.id, data)
  return success(res, 'Surah diperbarui.', result)
})

const deleteSurah = asyncHandler(async (req, res) => {
  const result = await adminService.deleteSurah(req.params.id)
  return success(res, 'Surah dihapus.', result)
})

// ─── Fase 2: Ayah ───
const listAyahs = asyncHandler(async (req, res) => {
  const query = listContentSchema.pick({ page: true, limit: true }).parse(req.query)
  const data = await adminService.listAyahs(req.params.id, query)
  return success(res, 'Daftar ayat.', data)
})

const getAyah = asyncHandler(async (req, res) => {
  const data = await adminService.getAyah(req.params.id)
  return success(res, 'Detail ayat.', data)
})

const createAyah = asyncHandler(async (req, res) => {
  const data = ayahSchema.parse(req.body)
  const result = await adminService.createAyah(req.params.id, data)
  return success(res, 'Ayat dibuat.', result, 201)
})

const updateAyah = asyncHandler(async (req, res) => {
  const data = ayahUpdateSchema.parse(req.body)
  const result = await adminService.updateAyah(req.params.id, data)
  return success(res, 'Ayat diperbarui.', result)
})

const deleteAyah = asyncHandler(async (req, res) => {
  const result = await adminService.deleteAyah(req.params.id)
  return success(res, 'Ayat dihapus.', result)
})

// ─── Fase 2: Quiz Question ───
const listQuestions = asyncHandler(async (req, res) => {
  const data = await adminService.listQuestions(req.params.id)
  return success(res, 'Daftar soal kuis.', data)
})

const createQuestion = asyncHandler(async (req, res) => {
  const data = createQuestionSchema.parse(req.body)
  const result = await adminService.createQuestion(req.params.id, data)
  return success(res, 'Soal kuis dibuat.', result, 201)
})

const updateQuestion = asyncHandler(async (req, res) => {
  const data = updateQuestionSchema.parse(req.body)
  const result = await adminService.updateQuestion(req.params.id, data)
  return success(res, 'Soal kuis diperbarui.', result)
})

const deleteQuestion = asyncHandler(async (req, res) => {
  const result = await adminService.deleteQuestion(req.params.id)
  return success(res, 'Soal kuis dihapus.', result)
})

// ─── Fase 2: Assets ───
const listAssets = asyncHandler(async (req, res) => {
  const data = await adminService.listAssets()
  return success(res, 'Daftar aset.', data)
})

const bumpBundleVersion = asyncHandler(async (req, res) => {
  const result = await adminService.bumpBundleVersion(req.params.id)
  return success(res, 'Versi bundle dinaikkan.', result)
})

// ─── Fase 3: Analytics ───
const analyticsOverview = asyncHandler(async (req, res) => {
  const data = await adminService.analyticsOverview()
  return success(res, 'Ringkasan analytics.', data)
})

const analyticsLeaderboard = asyncHandler(async (req, res) => {
  const query = leaderboardQuerySchema.parse(req.query)
  const data = await adminService.analyticsLeaderboard(query)
  return success(res, 'Papan peringkat.', data)
})

const analyticsQuizActivity = asyncHandler(async (req, res) => {
  const query = analyticsQuerySchema.parse(req.query)
  const data = await adminService.analyticsQuizActivity(query)
  return success(res, 'Aktivitas kuis per hari.', data)
})

const analyticsUserGrowth = asyncHandler(async (req, res) => {
  const query = analyticsQuerySchema.parse(req.query)
  const data = await adminService.analyticsUserGrowth(query)
  return success(res, 'Pertumbuhan user per hari.', data)
})

module.exports = {
  login,
  me,
  listUsers,
  getUser,
  setPremium,
  resetLives,
  softDeleteUser,
  restoreUser,
  resetProgress,
  listSurahs,
  getSurah,
  createSurah,
  updateSurah,
  deleteSurah,
  listAyahs,
  getAyah,
  createAyah,
  updateAyah,
  deleteAyah,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAssets,
  bumpBundleVersion,
  analyticsOverview,
  analyticsLeaderboard,
  analyticsQuizActivity,
  analyticsUserGrowth,
}
