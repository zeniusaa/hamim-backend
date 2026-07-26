const { prisma } = require('../../config/database')

const listBundles = async (userId) => {
  const [bundles, downloaded] = await Promise.all([
    prisma.assetBundle.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, version: true, total_size_bytes: true, description: true },
    }),
    prisma.userDownloadedAsset.findMany({
      where: { user_id: userId },
      select: { bundle_id: true },
    }),
  ])

  const downloadedIds = new Set(downloaded.map((d) => d.bundle_id))
  return bundles.map((b) => ({ ...b, is_downloaded: downloadedIds.has(b.id) }))
}

const getBundleDetail = async (bundleId) => {
  const bundle = await prisma.assetBundle.findUnique({
    where: { id: bundleId },
    include: {
      bundle_items: {
        select: { id: true, asset_type: true, asset_id: true, file_url: true },
      },
    },
  })
  if (!bundle) throw new Error('BUNDLE_NOT_FOUND')
  return bundle
}

const confirmDownload = async (userId, bundleId, appVersion) => {
  const bundle = await prisma.assetBundle.findUnique({ where: { id: bundleId } })
  if (!bundle) throw new Error('BUNDLE_NOT_FOUND')

  // @@unique([user_id, bundle_id]) sudah ada di schema — pakai upsert
  const record = await prisma.userDownloadedAsset.upsert({
    where: { user_id_bundle_id: { user_id: userId, bundle_id: bundleId } },
    update: { downloaded_at: new Date(), app_version: appVersion ?? null },
    create: { user_id: userId, bundle_id: bundleId, app_version: appVersion ?? null },
  })

  return { bundle_id: bundleId, bundle_name: bundle.name, downloaded_at: record.downloaded_at }
}

const checkUpdates = async (versionsParam) => {
  // Parse "juz_30_audio:1,ui_basic:2" → { juz_30_audio: 1, ui_basic: 2 }
  const clientVersions = {}
  if (versionsParam) {
    versionsParam.split(',').forEach((item) => {
      const [name, ver] = item.split(':')
      if (name && ver) clientVersions[name.trim()] = parseInt(ver)
    })
  }

  const bundles = await prisma.assetBundle.findMany({
    select: { id: true, name: true, version: true, total_size_bytes: true },
  })

  const updates = []
  const up_to_date = []

  bundles.forEach((b) => {
    const clientVer = clientVersions[b.name]
    if (clientVer === undefined || clientVer < b.version) {
      updates.push({ ...b, needs_update: true })
    } else {
      up_to_date.push(b.name)
    }
  })

  return { has_updates: updates.length > 0, updates, up_to_date }
}

// GET /assets/icons | /assets/backgrounds | /assets/music
// Dipakai kalau app butuh detail 1-1 (bukan lewat bundle), misal buat halaman "Ganti Ikon"/"Toko Tema".
const listIcons = () =>
  prisma.assetIcon.findMany({ orderBy: { name: 'asc' } })

const listBackgrounds = () =>
  prisma.assetBackground.findMany({ orderBy: { name: 'asc' } })

const listMusic = () =>
  prisma.assetMusic.findMany({ orderBy: { name: 'asc' } })

module.exports = { listBundles, getBundleDetail, confirmDownload, checkUpdates, listIcons, listBackgrounds, listMusic }