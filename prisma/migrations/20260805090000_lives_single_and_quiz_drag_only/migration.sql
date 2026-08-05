-- =============================================================
-- Ubah konsep nyawa jadi 1 nyawa saja + quiz hanya tipe drag_ayat
-- (melengkapi ayat / drag and drop arabic). Nyawa sekarang dipotong
-- setelah user menyelesaikan (POST) 1 kelompok ayat kuis, bukan lagi
-- tiap salah jawab satu soal.
-- =============================================================

-- 1) Bersihkan data quiz tipe 'multiple_choice' (sudah tidak dipakai lagi)
--    Urutan hapus: attempt dulu (FK restrict ke question), baru option, baru question.
DELETE uqa FROM `UserQuizAttempt` uqa
  INNER JOIN `QuizQuestion` qq ON uqa.question_id = qq.id
  WHERE qq.type = 'multiple_choice';

DELETE qo FROM `QuizOption` qo
  INNER JOIN `QuizQuestion` qq ON qo.question_id = qq.id
  WHERE qq.type = 'multiple_choice';

DELETE FROM `QuizQuestion` WHERE `type` = 'multiple_choice';

-- 2) Alter enum QuizType: hanya sisakan 'drag_ayat'
ALTER TABLE `QuizQuestion` MODIFY COLUMN `type` ENUM('drag_ayat') NOT NULL;

-- 3) Tambah kolom submitted_order untuk menyimpan urutan jawaban drag_ayat
ALTER TABLE `UserQuizAttempt` ADD COLUMN `submitted_order` JSON NULL;

-- 4) Nyawa: default & kapasitas maksimum jadi 1
ALTER TABLE `UserLives` MODIFY COLUMN `current_lives` INT NOT NULL DEFAULT 1;
ALTER TABLE `UserLives` MODIFY COLUMN `max_lives` INT NOT NULL DEFAULT 1;

-- Rapikan data lama supaya konsisten dengan aturan baru (nyawa maksimum 1)
UPDATE `UserLives` SET `max_lives` = 1 WHERE `max_lives` > 1;
UPDATE `UserLives` SET `current_lives` = 1 WHERE `current_lives` > 1;
