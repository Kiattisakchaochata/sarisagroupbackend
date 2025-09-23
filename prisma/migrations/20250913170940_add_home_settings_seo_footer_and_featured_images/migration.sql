-- AlterTable
ALTER TABLE `images` ADD COLUMN `cloudinary_public_id` VARCHAR(191) NULL,
    ADD COLUMN `featured_order` INTEGER NULL,
    ADD COLUMN `is_featured_home` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `HomeSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `hero_title` VARCHAR(191) NOT NULL,
    `hero_subtitle` VARCHAR(191) NOT NULL,
    `show_search` BOOLEAN NOT NULL DEFAULT true,
    `missions_title` VARCHAR(191) NULL,
    `missions_items` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeRow` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('food', 'cafe', 'beauty', 'carcare', 'events', 'videos', 'network', 'custom') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `cta_text` VARCHAR(191) NULL,
    `cta_href` VARCHAR(191) NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `order_number` INTEGER NOT NULL DEFAULT 0,
    `images` JSON NULL,
    `store_ids` JSON NULL,
    `video_ids` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `HomeRow_kind_visible_order_number_idx`(`kind`, `visible`, `order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSeo` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `meta_title` VARCHAR(191) NULL,
    `meta_description` VARCHAR(191) NULL,
    `keywords` VARCHAR(191) NULL,
    `og_image` VARCHAR(191) NULL,
    `jsonld` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteFooter` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `about_text` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `socials` JSON NULL,
    `links` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `images_is_featured_home_featured_order_idx` ON `images`(`is_featured_home`, `featured_order`);
