-- CreateTable
CREATE TABLE `Homepage` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `hero_title` VARCHAR(191) NULL,
    `hero_subtitle` VARCHAR(191) NULL,
    `missions` JSON NULL,
    `rows` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
