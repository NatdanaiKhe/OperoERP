-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");
