-- AlterTable
-- Tambah kolom role untuk dashboard admin (Fase 0).
-- Default 'USER'; akun admin ditandai 'ADMIN' (atau lewat env ADMIN_EMAILS).
ALTER TABLE `User` ADD COLUMN `role` VARCHAR(10) NOT NULL DEFAULT 'USER';
