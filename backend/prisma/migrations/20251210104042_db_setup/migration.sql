-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDOR');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PAID', 'UNPAID', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENDOR',
    "vendorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "corporateName" TEXT NOT NULL,
    "vendorReferenceName" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contractSignatory" TEXT,
    "bankingDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPlatform" (
    "vendorId" INTEGER NOT NULL,
    "platformId" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "VendorPlatform_pkey" PRIMARY KEY ("vendorId","platformId")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "payoutNumber" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "dateProcessed" TIMESTAMP(3),
    "status" "PayoutStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLineItem" (
    "id" SERIAL NOT NULL,
    "payoutId" INTEGER NOT NULL,
    "platformId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PayoutLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_vendorId_key" ON "User"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_payoutNumber_key" ON "Payout"("payoutNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPlatform" ADD CONSTRAINT "VendorPlatform_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPlatform" ADD CONSTRAINT "VendorPlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLineItem" ADD CONSTRAINT "PayoutLineItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLineItem" ADD CONSTRAINT "PayoutLineItem_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
