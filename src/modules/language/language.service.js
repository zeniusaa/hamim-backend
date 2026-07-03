const { prisma } = require('../../config/database')

// Cuma bahasa yang is_active = true yang ditampilkan ke user.
// Kalau nanti mau tambah bahasa baru tapi belum siap dipakai,
// tinggal set is_active: false dulu di database.
const getActiveLanguages = async () => {
  return prisma.language.findMany({
    where: { is_active: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: 'asc' },
  })
}

module.exports = { getActiveLanguages }
