-- Tambah penanda "sudah lewat First Session" yang terpisah dari is_onboarded.
-- is_onboarded = user sudah isi data onboarding (5 halaman).
-- first_session_completed = user sudah menyelesaikan kuis First Session (Al-Fatihah:1)
-- setelah onboarding, sebelum masuk HomePage. Lihat GitHub issue #8.
-- Sifatnya sekali set (false -> true), tidak pernah balik ke false.
ALTER TABLE `User` ADD COLUMN `first_session_completed` BOOLEAN NOT NULL DEFAULT false;
