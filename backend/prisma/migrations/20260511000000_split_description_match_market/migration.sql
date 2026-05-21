-- AlterTable: split description into match (nullable) + market (required)
ALTER TABLE "bets" RENAME COLUMN "description" TO "market";
ALTER TABLE "bets" ADD COLUMN "match" VARCHAR(200);
