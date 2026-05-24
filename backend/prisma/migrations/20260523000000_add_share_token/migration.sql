-- AlterTable
ALTER TABLE "bets" ADD COLUMN "share_token" VARCHAR(64);
CREATE UNIQUE INDEX "bets_share_token_key" ON "bets"("share_token");
