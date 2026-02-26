-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'CANCELLATION';

-- AlterEnum
ALTER TYPE "ReceivableStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT;
