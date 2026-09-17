/*
  Warnings:

  - You are about to drop the column `barcode` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_purchasable` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `uom_conversions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "uom_conversions" DROP CONSTRAINT "uom_conversions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "uom_conversions" DROP CONSTRAINT "uom_conversions_from_uom_id_fkey";

-- DropForeignKey
ALTER TABLE "uom_conversions" DROP CONSTRAINT "uom_conversions_to_uom_id_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "barcode",
DROP COLUMN "is_purchasable";

-- DropTable
DROP TABLE "uom_conversions";
