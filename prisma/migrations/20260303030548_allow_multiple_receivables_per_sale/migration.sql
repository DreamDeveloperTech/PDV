-- DropIndex
DROP INDEX "AccountReceivable_saleId_key";

-- CreateIndex
CREATE INDEX "AccountReceivable_saleId_idx" ON "AccountReceivable"("saleId");
