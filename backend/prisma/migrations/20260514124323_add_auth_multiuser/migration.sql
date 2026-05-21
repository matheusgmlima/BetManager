-- DropForeignKey
ALTER TABLE "ai_extraction_logs" DROP CONSTRAINT "ai_extraction_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "bankroll_entries" DROP CONSTRAINT "bankroll_entries_user_id_fkey";

-- DropForeignKey
ALTER TABLE "bets" DROP CONSTRAINT "bets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "betting_profiles" DROP CONSTRAINT "betting_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "bookmakers" DROP CONSTRAINT "bookmakers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "combined_bet_groups" DROP CONSTRAINT "combined_bet_groups_user_id_fkey";

-- DropForeignKey
ALTER TABLE "email_tokens" DROP CONSTRAINT "email_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "goals" DROP CONSTRAINT "goals_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sports" DROP CONSTRAINT "sports_user_id_fkey";

-- DropIndex
DROP INDEX "bookmakers_name_key";

-- DropIndex
DROP INDEX "goals_month_year_key";

-- DropIndex
DROP INDEX "sports_name_key";

-- AlterTable
ALTER TABLE "bankroll_entries" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bankroll_entries" ADD CONSTRAINT "bankroll_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports" ADD CONSTRAINT "sports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmakers" ADD CONSTRAINT "bookmakers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "betting_profiles" ADD CONSTRAINT "betting_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combined_bet_groups" ADD CONSTRAINT "combined_bet_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_extraction_logs" ADD CONSTRAINT "ai_extraction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
