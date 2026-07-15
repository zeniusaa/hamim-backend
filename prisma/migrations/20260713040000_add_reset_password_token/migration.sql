-- AlterTable
ALTER TABLE `pengguna`
    ADD COLUMN `hash_token_reset` VARCHAR(255) NULL,
    ADD COLUMN `token_reset_kadaluarsa` DATETIME(3) NULL;