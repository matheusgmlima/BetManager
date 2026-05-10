-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "betting_profile_id" INTEGER;

-- CreateTable
CREATE TABLE "betting_profiles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "betting_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bets_betting_profile_id_idx" ON "bets"("betting_profile_id");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_betting_profile_id_fkey" FOREIGN KEY ("betting_profile_id") REFERENCES "betting_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
