-- AlterTable
ALTER TABLE `PageSeo` ADD COLUMN `og_images` JSON NULL,
    MODIFY `path` VARCHAR(255) NOT NULL,
    MODIFY `title` VARCHAR(255) NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `og_image` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `TrackingScript` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('GA4', 'GTM', 'FacebookPixel', 'TikTokPixel', 'Custom') NOT NULL,
    `trackingId` VARCHAR(64) NULL,
    `script` TEXT NULL,
    `placement` ENUM('HEAD', 'BODY_END') NOT NULL DEFAULT 'HEAD',
    `strategy` ENUM('afterInteractive', 'lazyOnload', 'worker') NOT NULL DEFAULT 'afterInteractive',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrackingScript_provider_enabled_idx`(`provider`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PageSeo_updated_at_idx` ON `PageSeo`(`updated_at`);
