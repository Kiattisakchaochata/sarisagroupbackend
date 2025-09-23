/*
  Warnings:

  - You are about to alter the column `social_links` on the `stores` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `stores` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Made the column `avg_review` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `slug` to the `stores` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Category` ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    MODIFY `avg_review` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Review` ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `WebsiteVisitorCounter` MODIFY `id` VARCHAR(191) NOT NULL DEFAULT 'singleton';

-- AlterTable
ALTER TABLE `stores` ADD COLUMN `avg_rating` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `meta_description` VARCHAR(191) NULL,
    ADD COLUMN `meta_title` VARCHAR(191) NULL,
    ADD COLUMN `og_image` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `renewal_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `review_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    ADD COLUMN `website` VARCHAR(191) NULL,
    MODIFY `social_links` JSON NULL;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `phone` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Branch_store_id_is_active_idx`(`store_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpeningHour` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `branch_id` VARCHAR(191) NULL,
    `day` ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN') NOT NULL,
    `openTime` VARCHAR(191) NOT NULL,
    `closeTime` VARCHAR(191) NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,

    INDEX `OpeningHour_store_id_idx`(`store_id`),
    INDEX `OpeningHour_branch_id_idx`(`branch_id`),
    INDEX `OpeningHour_day_isOpen_idx`(`day`, `isOpen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewReply` (
    `id` VARCHAR(191) NOT NULL,
    `review_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `comment` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewReply_review_id_idx`(`review_id`),
    INDEX `ReviewReply_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `cloudinary_public_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `alt_text` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `href` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Banner_is_active_order_idx`(`is_active`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `youtube_url` VARCHAR(191) NOT NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `order_number` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `store_id` VARCHAR(191) NULL,

    INDEX `videos_is_active_start_date_end_date_idx`(`is_active`, `start_date`, `end_date`),
    INDEX `videos_store_id_idx`(`store_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SustainabilityTag` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SustainabilityTag_key_key`(`key`),
    INDEX `SustainabilityTag_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SustainabilityTagOnStore` (
    `store_id` VARCHAR(191) NOT NULL,
    `tag_id` VARCHAR(191) NOT NULL,

    INDEX `SustainabilityTagOnStore_tag_id_idx`(`tag_id`),
    PRIMARY KEY (`store_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Amenity` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Amenity_key_key`(`key`),
    INDEX `Amenity_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmenityOnStore` (
    `store_id` VARCHAR(191) NOT NULL,
    `amenity_id` VARCHAR(191) NOT NULL,

    INDEX `AmenityOnStore_amenity_id_idx`(`amenity_id`),
    PRIMARY KEY (`store_id`, `amenity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `cover_image` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Event_store_id_start_at_is_active_idx`(`store_id`, `start_at`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Category_slug_key` ON `Category`(`slug`);

-- CreateIndex
CREATE INDEX `Category_name_idx` ON `Category`(`name`);

-- CreateIndex
CREATE INDEX `Category_slug_idx` ON `Category`(`slug`);

-- CreateIndex
CREATE INDEX `Review_store_id_status_idx` ON `Review`(`store_id`, `status`);

-- CreateIndex
CREATE INDEX `images_store_id_idx` ON `images`(`store_id`);

-- CreateIndex
CREATE UNIQUE INDEX `stores_slug_key` ON `stores`(`slug`);

-- CreateIndex
CREATE INDEX `stores_category_id_idx` ON `stores`(`category_id`);

-- CreateIndex
CREATE INDEX `stores_is_active_avg_rating_idx` ON `stores`(`is_active`, `avg_rating`);

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpeningHour` ADD CONSTRAINT `OpeningHour_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpeningHour` ADD CONSTRAINT `OpeningHour_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewReply` ADD CONSTRAINT `ReviewReply_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewReply` ADD CONSTRAINT `ReviewReply_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `videos` ADD CONSTRAINT `videos_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SustainabilityTagOnStore` ADD CONSTRAINT `SustainabilityTagOnStore_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SustainabilityTagOnStore` ADD CONSTRAINT `SustainabilityTagOnStore_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `SustainabilityTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmenityOnStore` ADD CONSTRAINT `AmenityOnStore_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmenityOnStore` ADD CONSTRAINT `AmenityOnStore_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `Amenity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Review` RENAME INDEX `Review_user_id_fkey` TO `Review_user_id_idx`;
