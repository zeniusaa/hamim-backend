-- Soft delete akun: user yang minta hapus akun ditandai deleted_at, bukan langsung
-- dihapus dari DB. Penghapusan permanen dijalankan otomatis 30 hari kemudian oleh
-- scheduler di app.js (lihat src/utils/cleanupDeletedUsers.js) atau lewat
-- `node prisma/cleanup-deleted-users.js` manual/cron.
ALTER TABLE `User` ADD COLUMN `deleted_at` DATETIME(3) NULL;
CREATE INDEX `User_deleted_at_idx` ON `User`(`deleted_at`);
