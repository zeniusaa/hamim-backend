-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` TEXT NULL,
    `google_id` VARCHAR(255) NULL,
    `phone_number` VARCHAR(20) NULL,
    `phone_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_onboarded` BOOLEAN NOT NULL DEFAULT false,
    `reset_token_hash` VARCHAR(255) NULL,
    `reset_token_expires` DATETIME(3) NULL,
    `verification_token_hash` VARCHAR(255) NULL,
    `verification_token_expires` DATETIME(3) NULL,
    `language_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_google_id_key`(`google_id`),
    UNIQUE INDEX `User_phone_number_key`(`phone_number`),
    INDEX `User_language_id_idx`(`language_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserProfile` (
    `id` VARCHAR(36) NOT NULL,
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

    UNIQUE INDEX `UserProfile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLives` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `current_lives` INTEGER NOT NULL DEFAULT 3,
    `max_lives` INTEGER NOT NULL DEFAULT 3,
    `last_life_lost_at` DATETIME(3) NULL,
    `is_premium` BOOLEAN NOT NULL DEFAULT false,
    `premium_expires_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserLives_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Language` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(5) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Language_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Surah` (
    `id` VARCHAR(36) NOT NULL,
    `number` INTEGER NOT NULL,
    `name_arabic` VARCHAR(100) NOT NULL,
    `name_transliteration` VARCHAR(100) NOT NULL,
    `name_translation_id` VARCHAR(100) NOT NULL,
    `name_translation_en` VARCHAR(100) NOT NULL,
    `juz_start` INTEGER NOT NULL,
    `total_ayah` INTEGER NOT NULL,
    `revelation_type` ENUM('makkiyah', 'madaniyah') NOT NULL,

    UNIQUE INDEX `Surah_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ayah` (
    `id` VARCHAR(36) NOT NULL,
    `surah_id` VARCHAR(36) NOT NULL,
    `ayah_number` INTEGER NOT NULL,
    `juz_number` INTEGER NOT NULL,
    `text_arabic` TEXT NOT NULL,
    `text_uthmani` TEXT NOT NULL,
    `translation_id` TEXT NULL,
    `translation_en` TEXT NULL,
    `transliteration` TEXT NULL,

    UNIQUE INDEX `Ayah_surah_id_ayah_number_key`(`surah_id`, `ayah_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AudioFile` (
    `id` VARCHAR(36) NOT NULL,
    `ayah_id` VARCHAR(36) NOT NULL,
    `ayah_end_number` INTEGER NULL,
    `audio_order` INTEGER NOT NULL DEFAULT 1,
    `qari_name` VARCHAR(100) NOT NULL DEFAULT 'Maqdis',
    `file_url` TEXT NOT NULL,
    `duration_seconds` DOUBLE NULL,
    `file_size_bytes` BIGINT NULL,

    INDEX `AudioFile_ayah_id_idx`(`ayah_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetIcon` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `category` ENUM('ui', 'game', 'badge', 'avatar') NOT NULL,
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `AssetIcon_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetBackground` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `theme` VARCHAR(50) NOT NULL DEFAULT 'default',
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `AssetBackground_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetMusic` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('bgm', 'sfx', 'notification') NOT NULL,
    `file_url` TEXT NOT NULL,
    `duration_seconds` DOUBLE NULL,
    `file_size_bytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `AssetMusic_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetBundle` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `total_size_bytes` BIGINT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `AssetBundle_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetBundleItem` (
    `id` VARCHAR(36) NOT NULL,
    `bundle_id` VARCHAR(36) NOT NULL,
    `asset_type` ENUM('audio', 'icon', 'background', 'music') NOT NULL,
    `asset_id` VARCHAR(36) NOT NULL,
    `file_url` TEXT NOT NULL,

    INDEX `AssetBundleItem_bundle_id_idx`(`bundle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDownloadedAsset` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `bundle_id` VARCHAR(36) NOT NULL,
    `downloaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `app_version` VARCHAR(20) NULL,

    INDEX `UserDownloadedAsset_bundle_id_idx`(`bundle_id`),
    UNIQUE INDEX `UserDownloadedAsset_user_id_bundle_id_key`(`user_id`, `bundle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserProgress` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `ayah_id` VARCHAR(36) NOT NULL,
    `stage` ENUM('listening', 'reading', 'quiz') NOT NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,

    INDEX `UserProgress_ayah_id_idx`(`ayah_id`),
    UNIQUE INDEX `UserProgress_user_id_ayah_id_stage_key`(`user_id`, `ayah_id`, `stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuizQuestion` (
    `id` VARCHAR(36) NOT NULL,
    `ayah_id` VARCHAR(36) NOT NULL,
    `type` ENUM('multiple_choice', 'drag_ayat') NOT NULL,
    `question_text` TEXT NOT NULL,
    `language_id` VARCHAR(36) NOT NULL,

    INDEX `QuizQuestion_ayah_id_idx`(`ayah_id`),
    INDEX `QuizQuestion_language_id_idx`(`language_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuizOption` (
    `id` VARCHAR(36) NOT NULL,
    `question_id` VARCHAR(36) NOT NULL,
    `option_text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,

    INDEX `QuizOption_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserQuizAttempt` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `question_id` VARCHAR(36) NOT NULL,
    `selected_option_id` VARCHAR(36) NULL,
    `is_correct` BOOLEAN NOT NULL,
    `time_taken_seconds` DOUBLE NULL,
    `attempted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserQuizAttempt_question_id_idx`(`question_id`),
    INDEX `UserQuizAttempt_selected_option_id_idx`(`selected_option_id`),
    INDEX `UserQuizAttempt_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLevel` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `level` INTEGER NOT NULL,
    `achieved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserLevel_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaderboardSnapshot` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `total_juz_completed` INTEGER NOT NULL DEFAULT 0,
    `current_level` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LeaderboardSnapshot_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserActivityLog` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `surah_id` VARCHAR(36) NOT NULL,
    `ayah_id` VARCHAR(36) NULL,
    `activity_type` VARCHAR(30) NOT NULL,
    `score` INTEGER NULL,
    `duration_seconds` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserActivityLog_surah_id_idx`(`surah_id`),
    INDEX `UserActivityLog_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `Language`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProfile` ADD CONSTRAINT `UserProfile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLives` ADD CONSTRAINT `UserLives_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ayah` ADD CONSTRAINT `Ayah_surah_id_fkey` FOREIGN KEY (`surah_id`) REFERENCES `Surah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AudioFile` ADD CONSTRAINT `AudioFile_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `Ayah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetBundleItem` ADD CONSTRAINT `AssetBundleItem_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `AssetBundle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDownloadedAsset` ADD CONSTRAINT `UserDownloadedAsset_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `AssetBundle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDownloadedAsset` ADD CONSTRAINT `UserDownloadedAsset_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProgress` ADD CONSTRAINT `UserProgress_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `Ayah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProgress` ADD CONSTRAINT `UserProgress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizQuestion` ADD CONSTRAINT `QuizQuestion_ayah_id_fkey` FOREIGN KEY (`ayah_id`) REFERENCES `Ayah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizQuestion` ADD CONSTRAINT `QuizQuestion_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `Language`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizOption` ADD CONSTRAINT `QuizOption_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `QuizQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserQuizAttempt` ADD CONSTRAINT `UserQuizAttempt_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `QuizQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserQuizAttempt` ADD CONSTRAINT `UserQuizAttempt_selected_option_id_fkey` FOREIGN KEY (`selected_option_id`) REFERENCES `QuizOption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserQuizAttempt` ADD CONSTRAINT `UserQuizAttempt_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLevel` ADD CONSTRAINT `UserLevel_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardSnapshot` ADD CONSTRAINT `LeaderboardSnapshot_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivityLog` ADD CONSTRAINT `UserActivityLog_surah_id_fkey` FOREIGN KEY (`surah_id`) REFERENCES `Surah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivityLog` ADD CONSTRAINT `UserActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
