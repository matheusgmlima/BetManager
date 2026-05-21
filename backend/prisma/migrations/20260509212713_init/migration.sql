-- CreateEnum
CREATE TYPE "BetResult" AS ENUM ('won', 'lost', 'void', 'pending');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('simple', 'combined');

-- CreateEnum
CREATE TYPE "BetSource" AS ENUM ('manual', 'ai_extract');

-- CreateTable
CREATE TABLE "sports" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmakers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combined_bet_groups" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "total_odds" DECIMAL(10,4),
    "amount_wagered" DECIMAL(10,2) NOT NULL,
    "payout" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "result" "BetResult" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combined_bet_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" SERIAL NOT NULL,
    "sport_id" INTEGER,
    "bookmaker_id" INTEGER NOT NULL,
    "combined_id" INTEGER,
    "date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "bet_type" "BetType" NOT NULL DEFAULT 'simple',
    "is_combined" BOOLEAN NOT NULL DEFAULT false,
    "amount_wagered" DECIMAL(10,2) NOT NULL,
    "odds" DECIMAL(10,4),
    "payout" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "result" "BetResult" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "source" "BetSource" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" SERIAL NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "target_profit" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_extraction_logs" (
    "id" SERIAL NOT NULL,
    "model_used" VARCHAR(50) NOT NULL,
    "bets_detected" INTEGER NOT NULL DEFAULT 0,
    "bets_confirmed" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_extraction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sports_name_key" ON "sports"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bookmakers_name_key" ON "bookmakers"("name");

-- CreateIndex
CREATE INDEX "bets_date_idx" ON "bets"("date" DESC);

-- CreateIndex
CREATE INDEX "bets_result_idx" ON "bets"("result");

-- CreateIndex
CREATE INDEX "bets_sport_id_idx" ON "bets"("sport_id");

-- CreateIndex
CREATE INDEX "bets_bookmaker_id_idx" ON "bets"("bookmaker_id");

-- CreateIndex
CREATE INDEX "bets_bet_type_idx" ON "bets"("bet_type");

-- CreateIndex
CREATE UNIQUE INDEX "goals_month_year_key" ON "goals"("month", "year");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_bookmaker_id_fkey" FOREIGN KEY ("bookmaker_id") REFERENCES "bookmakers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_combined_id_fkey" FOREIGN KEY ("combined_id") REFERENCES "combined_bet_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
