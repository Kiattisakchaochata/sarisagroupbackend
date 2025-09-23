/*
  Warnings:

  - You are about to alter the column `name` on the `stores` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - You are about to alter the column `phone` on the `stores` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `slug` on the `stores` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(160)`.

*/
-- AlterTable
ALTER TABLE `stores` MODIFY `name` VARCHAR(120) NOT NULL,
    MODIFY `description` TEXT NOT NULL,
    MODIFY `address` TEXT NOT NULL,
    MODIFY `cover_image` VARCHAR(512) NULL,
    MODIFY `meta_description` TEXT NULL,
    MODIFY `meta_title` VARCHAR(255) NULL,
    MODIFY `og_image` VARCHAR(512) NULL,
    MODIFY `phone` VARCHAR(50) NULL,
    MODIFY `slug` VARCHAR(160) NOT NULL,
    MODIFY `website` VARCHAR(255) NULL;
