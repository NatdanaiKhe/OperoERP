-- CreateTable
CREATE TABLE "menu_visibility" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "menu_key" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_visibility_role_id_idx" ON "menu_visibility"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_visibility_role_id_menu_key_key" ON "menu_visibility"("role_id", "menu_key");

-- AddForeignKey
ALTER TABLE "menu_visibility" ADD CONSTRAINT "menu_visibility_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
