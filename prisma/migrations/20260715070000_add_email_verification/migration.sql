-- AlterTable
ALTER TABLE `pengguna`
    ADD COLUMN `email_terverifikasi` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hash_token_verifikasi` VARCHAR(255) NULL,
    ADD COLUMN `token_verifikasi_kadaluarsa` DATETIME(3) NULL;
