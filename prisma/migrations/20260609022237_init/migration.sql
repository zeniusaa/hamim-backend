-- Migration: add audio grouping columns to audio_files
-- ayah_id      = ayat PERTAMA yang diccover audio ini (existing FK)
-- ayah_end_number = nomor ayat TERAKHIR dalam kelompok (nullable = 1 ayat saja)
-- audio_order  = urutan audio dalam surat (angka sebelum _ pada nama file)

ALTER TABLE `audio_files`
  ADD COLUMN `ayah_end_number` INTEGER NULL AFTER `ayah_id`,
  ADD COLUMN `audio_order`     INTEGER NOT NULL DEFAULT 1 AFTER `ayah_end_number`;
