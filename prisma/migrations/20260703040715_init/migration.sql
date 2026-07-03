-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` TEXT NULL,
    `google_id` VARCHAR(255) NULL,
    `phone_number` VARCHAR(20) NULL,
    `phone_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_onboarded` BOOLEAN NOT NULL DEFAULT false,
    `language_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    UNIQUE INDEX `users_phone_number_key`(`phone_number`),
    INDEX `users_language_id_fkey`(`language_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `display_name` VARCHAR(100) NULL,
    `avatar_url` TEXT NULL,
    `learning_start` ENUM('juz_awal', 'juz_akhir') NOT NULL DEFAULT 'juz_akhir',
    `daily_target_minutes` INTEGER NOT NULL DEFAULT 15,
    `audio_repeat_count` INTEGER NOT NULL DEFAULT 3,
    `motivation_text` TEXT NULL,
    `referral_source` VARCHAR(100) NULL,
    `current_level` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `languages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(5) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `languages_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surahs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` INTEGER NOT NULL,
    `name_arabic` VARCHAR(100) NOT NULL,
    `name_transliteration` VARCHAR(100) NOT NULL,
    `name_translation_id` VARCHAR(100) NOT NULL,
    `name_translation_en` VARCHAR(100) NOT NULL,
    `juz_start` INTEGER NOT NULL,
    `total_ayah` INTEGER NOT NULL,
    `revelation_type` ENUM('makkiyah', 'madaniyah') NOT NULL,

    UNIQUE INDEX `surahs_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ayahs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `surah_id` INTEGER NOT NULL,
    `ayah_number` INTEGER NOT NULL,
    `juz_number` INTEGER NOT NULL,
    `text_arabic` TEXT NOT NULL,
    `text_uthmani` TEXT NOT NULL,
    `translation_id` TEXT NULL,
    `translation_en` TEXT NULL,
    `transliteration` TEXT NULL,

    UNIQUE INDEX `ayahs_surah_id_ayah_number_key`(`surah_id`, `ayah_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audio_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ayah_id` INTEGER NOT NULL,
    `ayah_end_number` INTEGER NULL,
    `audio_order` INTEGER NOT NULL DEFAULT 1,
    `qari_name` VARCHAR(100) NOT NULL DEFAULT 'Maqdis',
    `file_url` TEXT NOT NULL,
    `duration_seconds` DOUBLE NULL,
    `file_size_bytes` BIGINT NULL,

    INDEX `audio_files_ayah_id_fkey`(`ayah_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets_icon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `category` ENUM('ui', 'game', 'badge', 'avatar') NOT NULL,
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `assets_icon_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets_background` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `theme` VARCHAR(50) NOT NULL DEFAULT 'default',
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `assets_background_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets_music` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('bgm', 'sfx', 'notification') NOT NULL,
    `file_url` TEXT NOT NULL,
    `duration_seconds` DOUBLE NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `assets_music_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_bundles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `total_size_bytes` BIGINT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `asset_bundles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_bundle_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bundle_id` INTEGER NOT NULL,
    `asset_type` ENUM('audio', 'icon', 'background', 'music') NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `file_url` TEXT NOT NULL,

    INDEX `asset_bundle_items_bundle_id_fkey`(`bundle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_downloaded_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `bundle_id` INTEGER NOT NULL,
    `downloaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `app_version` VARCHAR(20) NULL,

    INDEX `user_downloaded_assets_bundle_id_fkey`(`bundle_id`),
    UNIQUE INDEX `user_downloaded_assets_user_id_bundle_id_key`(`user_id`, `bundle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `ayah_id` INTEGER NOT NULL,
    `stage` ENUM('listening', 'reading', 'quiz') NOT NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,

    INDEX `user_progress_ayah_id_fkey`(`ayah_id`),
    UNIQUE INDEX `user_progress_user_id_ayah_id_stage_key`(`user_id`, `ayah_id`, `stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ayah_id` INTEGER NOT NULL,
    `type` ENUM('multiple_choice', 'drag_ayat') NOT NULL,
    `question_text` TEXT NOT NULL,
    `language_id` INTEGER NOT NULL,

    INDEX `quiz_questions_ayah_id_fkey`(`ayah_id`),
    INDEX `quiz_questions_language_id_fkey`(`language_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `option_text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,

    INDEX `quiz_options_question_id_fkey`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_quiz_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `question_id` INTEGER NOT NULL,
    `selected_option_id` INTEGER NULL,
    `is_correct` BOOLEAN NOT NULL,
    `time_taken_seconds` DOUBLE NULL,
    `attempted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_quiz_attempts_question_id_fkey`(`question_id`),
    INDEX `user_quiz_attempts_selected_option_id_fkey`(`selected_option_id`),
    INDEX `user_quiz_attempts_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_levels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `level` INTEGER NOT NULL,
    `achieved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_levels_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leaderboard_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `total_juz_completed` INTEGER NOT NULL DEFAULT 0,
    `current_level` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `leaderboard_snapshots_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `surah_id` INTEGER NOT NULL,
    `ayah_id` INTEGER NULL,
    `activity_type` VARCHAR(30) NOT NULL,
    `score` INTEGER NULL,
    `duration_seconds` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_activity_logs_surah_id_fkey`(`surah_id`),
    INDEX `user_activity_logs_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ayahs` ADD CONSTRAINT `ayahs_surah_id_fkey` FOREIGN KEY (`surah_id`) REFERENCES `surahs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audio_files` ADD CONSTRAINT `audio_files_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `ayahs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_bundle_items` ADD CONSTRAINT `asset_bundle_items_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `asset_bundles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_downloaded_assets` ADD CONSTRAINT `user_downloaded_assets_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `asset_bundles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_downloaded_assets` ADD CONSTRAINT `user_downloaded_assets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `ayahs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `ayahs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_options` ADD CONSTRAINT `quiz_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quiz_attempts` ADD CONSTRAINT `user_quiz_attempts_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quiz_attempts` ADD CONSTRAINT `user_quiz_attempts_selected_option_id_fkey` FOREIGN KEY (`selected_option_id`) REFERENCES `quiz_options`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quiz_attempts` ADD CONSTRAINT `user_quiz_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_levels` ADD CONSTRAINT `user_levels_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaderboard_snapshots` ADD CONSTRAINT `leaderboard_snapshots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity_logs` ADD CONSTRAINT `user_activity_logs_surah_id_fkey` FOREIGN KEY (`surah_id`) REFERENCES `surahs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity_logs` ADD CONSTRAINT `user_activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
