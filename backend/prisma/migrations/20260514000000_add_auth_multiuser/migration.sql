-- ─── Enums novos ──────────────────────────────────────────────────────────────
CREATE TYPE "TokenType" AS ENUM ('verify_email', 'reset_password');
CREATE TYPE "BankrollType" AS ENUM ('initial', 'deposit', 'withdrawal');

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
    "id"             SERIAL PRIMARY KEY,
    "username"       VARCHAR(50)  NOT NULL UNIQUE,
    "email"          VARCHAR(255) NOT NULL UNIQUE,
    "password_hash"  TEXT         NOT NULL,
    "email_verified" BOOLEAN      NOT NULL DEFAULT false,
    "unit_value"     DECIMAL(10,2) NOT NULL DEFAULT 10,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Email Tokens ─────────────────────────────────────────────────────────────
CREATE TABLE "email_tokens" (
    "id"         SERIAL PRIMARY KEY,
    "user_id"    INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token"      VARCHAR(64)  NOT NULL UNIQUE,
    "type"       "TokenType"  NOT NULL DEFAULT 'verify_email',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used"       BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Bankroll Entries ─────────────────────────────────────────────────────────
CREATE TABLE "bankroll_entries" (
    "id"         SERIAL PRIMARY KEY,
    "user_id"    INTEGER        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "amount"     DECIMAL(10,2)  NOT NULL,
    "type"       "BankrollType" NOT NULL,
    "note"       TEXT,
    "date"       DATE           NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "bankroll_entries_user_id_idx" ON "bankroll_entries"("user_id");

-- ─── Adicionar userId nas tabelas existentes ───────────────────────────────────
-- Cria um usuário temporário para dados legados (se existirem)
DO $$
DECLARE v_uid INTEGER;
BEGIN
    INSERT INTO "users" ("username","email","password_hash","email_verified")
    VALUES ('legacy','legacy@betmanager.local','$legacy$', true)
    ON CONFLICT DO NOTHING
    RETURNING "id" INTO v_uid;

    IF v_uid IS NULL THEN
        SELECT "id" INTO v_uid FROM "users" WHERE "username" = 'legacy';
    END IF;

    -- Sports: drop unique name, add isDefault + userId
    ALTER TABLE "sports" DROP CONSTRAINT IF EXISTS "sports_name_key";
    ALTER TABLE "sports"
        ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "user_id"    INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "sports" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    CREATE INDEX "sports_user_id_idx" ON "sports"("user_id");

    -- Bookmakers: drop unique name, add isDefault + userId
    ALTER TABLE "bookmakers" DROP CONSTRAINT IF EXISTS "bookmakers_name_key";
    ALTER TABLE "bookmakers"
        ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "user_id"    INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "bookmakers" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    CREATE INDEX "bookmakers_user_id_idx" ON "bookmakers"("user_id");

    -- BettingProfiles: add userId NOT NULL
    ALTER TABLE "betting_profiles"
        ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "betting_profiles" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    ALTER TABLE "betting_profiles" ALTER COLUMN "user_id" SET NOT NULL;
    CREATE INDEX "betting_profiles_user_id_idx" ON "betting_profiles"("user_id");

    -- CombinedBetGroups: add userId NOT NULL
    ALTER TABLE "combined_bet_groups"
        ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "combined_bet_groups" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    ALTER TABLE "combined_bet_groups" ALTER COLUMN "user_id" SET NOT NULL;
    CREATE INDEX "combined_bet_groups_user_id_idx" ON "combined_bet_groups"("user_id");

    -- Bets: add userId NOT NULL
    ALTER TABLE "bets"
        ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "bets" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    ALTER TABLE "bets" ALTER COLUMN "user_id" SET NOT NULL;
    CREATE INDEX "bets_user_id_idx" ON "bets"("user_id");

    -- Goals: drop old unique, add userId, new unique
    ALTER TABLE "goals" DROP CONSTRAINT IF EXISTS "goals_month_year_key";
    ALTER TABLE "goals"
        ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "goals" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    ALTER TABLE "goals" ALTER COLUMN "user_id" SET NOT NULL;
    CREATE UNIQUE INDEX "goals_user_id_month_year_key" ON "goals"("user_id","month","year");
    CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

    -- AiExtractionLogs: add userId NOT NULL
    ALTER TABLE "ai_extraction_logs"
        ADD COLUMN "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;
    UPDATE "ai_extraction_logs" SET "user_id" = v_uid WHERE "user_id" IS NULL;
    ALTER TABLE "ai_extraction_logs" ALTER COLUMN "user_id" SET NOT NULL;
    CREATE INDEX "ai_extraction_logs_user_id_idx" ON "ai_extraction_logs"("user_id");
END $$;
