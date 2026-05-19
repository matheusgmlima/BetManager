-- CreateTable
CREATE TABLE "tipsters" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipsters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tipsters_user_id_idx" ON "tipsters"("user_id");

-- AddForeignKey
ALTER TABLE "tipsters" ADD CONSTRAINT "tipsters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "bets" ADD COLUMN "tipster_id" INTEGER;

-- CreateIndex
CREATE INDEX "bets_tipster_id_idx" ON "bets"("tipster_id");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_tipster_id_fkey" FOREIGN KEY ("tipster_id") REFERENCES "tipsters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
