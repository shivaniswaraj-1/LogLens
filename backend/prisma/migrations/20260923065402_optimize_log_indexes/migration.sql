-- DropIndex
DROP INDEX "Log_errorPatternId_idx";

-- DropIndex
DROP INDEX "Log_level_idx";

-- DropIndex
DROP INDEX "Log_service_idx";

-- CreateIndex
CREATE INDEX "Log_errorPatternId_timestamp_idx" ON "Log"("errorPatternId", "timestamp");

-- CreateIndex
CREATE INDEX "Log_level_timestamp_idx" ON "Log"("level", "timestamp");
