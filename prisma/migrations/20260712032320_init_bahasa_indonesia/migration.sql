-- CreateTable
CREATE TABLE `pengguna` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `kata_sandi_hash` TEXT NULL,
    `id_google` VARCHAR(255) NULL,
    `nomor_telepon` VARCHAR(20) NULL,
    `telepon_terverifikasi` BOOLEAN NOT NULL DEFAULT false,
    `sudah_onboarding` BOOLEAN NOT NULL DEFAULT false,
    `id_bahasa` INTEGER NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diperbarui_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pengguna_email_key`(`email`),
    UNIQUE INDEX `pengguna_id_google_key`(`id_google`),
    UNIQUE INDEX `pengguna_nomor_telepon_key`(`nomor_telepon`),
    INDEX `pengguna_id_bahasa_idx`(`id_bahasa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profil_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `nama_tampilan` VARCHAR(100) NULL,
    `url_avatar` TEXT NULL,
    `mulai_belajar` ENUM('juz_awal', 'juz_akhir') NOT NULL DEFAULT 'juz_akhir',
    `target_menit_harian` INTEGER NOT NULL DEFAULT 15,
    `jumlah_pengulangan_audio` INTEGER NOT NULL DEFAULT 3,
    `teks_motivasi` TEXT NULL,
    `sumber_referensi` VARCHAR(100) NULL,
    `level_saat_ini` INTEGER NOT NULL DEFAULT 1,
    `diperbarui_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profil_pengguna_id_pengguna_key`(`id_pengguna`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bahasa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(5) NOT NULL,
    `nama` VARCHAR(50) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `bahasa_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomor` INTEGER NOT NULL,
    `nama_arab` VARCHAR(100) NOT NULL,
    `nama_transliterasi` VARCHAR(100) NOT NULL,
    `nama_terjemahan_id` VARCHAR(100) NOT NULL,
    `nama_terjemahan_en` VARCHAR(100) NOT NULL,
    `juz_mulai` INTEGER NOT NULL,
    `total_ayat` INTEGER NOT NULL,
    `tempat_turun` ENUM('makkiyah', 'madaniyah') NOT NULL,

    UNIQUE INDEX `surah_nomor_key`(`nomor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ayat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_surah` INTEGER NOT NULL,
    `nomor_ayat` INTEGER NOT NULL,
    `nomor_juz` INTEGER NOT NULL,
    `teks_arab` TEXT NOT NULL,
    `teks_utsmani` TEXT NOT NULL,
    `terjemahan_id` TEXT NULL,
    `terjemahan_en` TEXT NULL,
    `transliterasi` TEXT NULL,

    UNIQUE INDEX `ayat_id_surah_nomor_ayat_key`(`id_surah`, `nomor_ayat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berkas_audio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ayat` INTEGER NOT NULL,
    `nomor_ayat_akhir` INTEGER NULL,
    `urutan_audio` INTEGER NOT NULL DEFAULT 1,
    `nama_qari` VARCHAR(100) NOT NULL DEFAULT 'Maqdis',
    `url_berkas` TEXT NOT NULL,
    `durasi_detik` DOUBLE NULL,
    `ukuran_berkas_byte` BIGINT NULL,

    INDEX `berkas_audio_id_ayat_idx`(`id_ayat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aset_ikon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `kategori` ENUM('ui', 'game', 'badge', 'avatar') NOT NULL,
    `url_berkas` TEXT NOT NULL,
    `ukuran_berkas_byte` BIGINT NULL,
    `versi` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `aset_ikon_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aset_latar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `tema` VARCHAR(50) NOT NULL DEFAULT 'default',
    `url_berkas` TEXT NOT NULL,
    `ukuran_berkas_byte` BIGINT NULL,
    `versi` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `aset_latar_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aset_musik` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `jenis` ENUM('bgm', 'sfx', 'notification') NOT NULL,
    `url_berkas` TEXT NOT NULL,
    `durasi_detik` DOUBLE NULL,
    `ukuran_berkas_byte` BIGINT NULL,
    `versi` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `aset_musik_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paket_aset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `versi` INTEGER NOT NULL DEFAULT 1,
    `total_ukuran_byte` BIGINT NULL,
    `deskripsi` TEXT NULL,

    UNIQUE INDEX `paket_aset_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_paket_aset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paket` INTEGER NOT NULL,
    `jenis_aset` ENUM('audio', 'icon', 'background', 'music') NOT NULL,
    `id_aset` INTEGER NOT NULL,
    `url_berkas` TEXT NOT NULL,

    INDEX `item_paket_aset_id_paket_idx`(`id_paket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unduhan_aset_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `id_paket` INTEGER NOT NULL,
    `diunduh_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `versi_aplikasi` VARCHAR(20) NULL,

    INDEX `unduhan_aset_pengguna_id_paket_idx`(`id_paket`),
    UNIQUE INDEX `unduhan_aset_pengguna_id_pengguna_id_paket_key`(`id_pengguna`, `id_paket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `progres_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `id_ayat` INTEGER NOT NULL,
    `tahap` ENUM('listening', 'reading', 'quiz') NOT NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `selesai_pada` DATETIME(3) NULL,
    `jumlah_percobaan` INTEGER NOT NULL DEFAULT 0,

    INDEX `progres_pengguna_id_ayat_idx`(`id_ayat`),
    UNIQUE INDEX `progres_pengguna_id_pengguna_id_ayat_tahap_key`(`id_pengguna`, `id_ayat`, `tahap`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soal_kuis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ayat` INTEGER NOT NULL,
    `jenis` ENUM('multiple_choice', 'drag_ayat') NOT NULL,
    `teks_soal` TEXT NOT NULL,
    `id_bahasa` INTEGER NOT NULL,

    INDEX `soal_kuis_id_ayat_idx`(`id_ayat`),
    INDEX `soal_kuis_id_bahasa_idx`(`id_bahasa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opsi_kuis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_soal` INTEGER NOT NULL,
    `teks_opsi` TEXT NOT NULL,
    `benar` BOOLEAN NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    INDEX `opsi_kuis_id_soal_idx`(`id_soal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `percobaan_kuis_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `id_soal` INTEGER NOT NULL,
    `id_opsi_dipilih` INTEGER NULL,
    `benar` BOOLEAN NOT NULL,
    `waktu_detik` DOUBLE NULL,
    `dicoba_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `percobaan_kuis_pengguna_id_soal_idx`(`id_soal`),
    INDEX `percobaan_kuis_pengguna_id_opsi_dipilih_idx`(`id_opsi_dipilih`),
    INDEX `percobaan_kuis_pengguna_id_pengguna_idx`(`id_pengguna`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `level` INTEGER NOT NULL,
    `dicapai_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `level_pengguna_id_pengguna_idx`(`id_pengguna`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `papan_peringkat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `total_juz_selesai` INTEGER NOT NULL DEFAULT 0,
    `level_saat_ini` INTEGER NOT NULL DEFAULT 1,
    `diperbarui_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `papan_peringkat_id_pengguna_key`(`id_pengguna`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_aktivitas_pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` VARCHAR(36) NOT NULL,
    `id_surah` INTEGER NOT NULL,
    `id_ayat` INTEGER NULL,
    `jenis_aktivitas` VARCHAR(30) NOT NULL,
    `skor` INTEGER NULL,
    `durasi_detik` DOUBLE NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `log_aktivitas_pengguna_id_surah_idx`(`id_surah`),
    INDEX `log_aktivitas_pengguna_id_pengguna_idx`(`id_pengguna`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_id_bahasa_fkey` FOREIGN KEY (`id_bahasa`) REFERENCES `bahasa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profil_pengguna` ADD CONSTRAINT `profil_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ayat` ADD CONSTRAINT `ayat_id_surah_fkey` FOREIGN KEY (`id_surah`) REFERENCES `surah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `berkas_audio` ADD CONSTRAINT `berkas_audio_id_ayat_fkey` FOREIGN KEY (`id_ayat`) REFERENCES `ayat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_paket_aset` ADD CONSTRAINT `item_paket_aset_id_paket_fkey` FOREIGN KEY (`id_paket`) REFERENCES `paket_aset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unduhan_aset_pengguna` ADD CONSTRAINT `unduhan_aset_pengguna_id_paket_fkey` FOREIGN KEY (`id_paket`) REFERENCES `paket_aset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unduhan_aset_pengguna` ADD CONSTRAINT `unduhan_aset_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progres_pengguna` ADD CONSTRAINT `progres_pengguna_id_ayat_fkey` FOREIGN KEY (`id_ayat`) REFERENCES `ayat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progres_pengguna` ADD CONSTRAINT `progres_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soal_kuis` ADD CONSTRAINT `soal_kuis_id_ayat_fkey` FOREIGN KEY (`id_ayat`) REFERENCES `ayat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soal_kuis` ADD CONSTRAINT `soal_kuis_id_bahasa_fkey` FOREIGN KEY (`id_bahasa`) REFERENCES `bahasa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opsi_kuis` ADD CONSTRAINT `opsi_kuis_id_soal_fkey` FOREIGN KEY (`id_soal`) REFERENCES `soal_kuis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `percobaan_kuis_pengguna` ADD CONSTRAINT `percobaan_kuis_pengguna_id_soal_fkey` FOREIGN KEY (`id_soal`) REFERENCES `soal_kuis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `percobaan_kuis_pengguna` ADD CONSTRAINT `percobaan_kuis_pengguna_id_opsi_dipilih_fkey` FOREIGN KEY (`id_opsi_dipilih`) REFERENCES `opsi_kuis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `percobaan_kuis_pengguna` ADD CONSTRAINT `percobaan_kuis_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_pengguna` ADD CONSTRAINT `level_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `papan_peringkat` ADD CONSTRAINT `papan_peringkat_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_aktivitas_pengguna` ADD CONSTRAINT `log_aktivitas_pengguna_id_surah_fkey` FOREIGN KEY (`id_surah`) REFERENCES `surah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_aktivitas_pengguna` ADD CONSTRAINT `log_aktivitas_pengguna_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
