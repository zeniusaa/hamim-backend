-- AddIdempotencyKey
-- Idempotency key untuk mencegah double-submit group-attempt quiz.
-- Nullable: request lama (tanpa key) tetap NULL — MySQL memperlakukan
-- NULL sebagai unik per baris, jadi data lama tidak bentrok.
ALTER TABLE `UserQuizAttempt` ADD COLUMN `idempotency_key` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `UserQuizAttempt_user_id_question_id_idempotency_key_key`
ON `UserQuizAttempt`(`user_id`, `question_id`, `idempotency_key`);
