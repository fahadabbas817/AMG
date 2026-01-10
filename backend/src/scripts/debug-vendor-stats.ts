import { PrismaClient } from '../../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (2 levels up from src/scripts)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function debugStats() {
  try {
    // 1. Get a vendor with many records
    const vendor = await prisma.vendor.findFirst({
      where: { revenueRecords: { some: {} } },
      include: { revenueRecords: { take: 1 } }, // minimal include just to valid
    });

    if (!vendor) {
      console.log('No vendor with revenue found.');
      return;
    }

    const vendorId = vendor.id;
    console.log(
      `Debugging Stats for Vendor: ${vendor.companyName} (${vendorId})`,
    );

    // 2. Count Total Records
    const totalCount = await prisma.revenueRecord.count({
      where: { vendorId },
    });
    const totalEarned = await prisma.revenueRecord.aggregate({
      where: { vendorId },
      _sum: { vendorNet: true },
    });

    // 3. Paid
    const paidCount = await prisma.revenueRecord.count({
      where: { vendorId, payout: { status: 'PAID' } },
    });
    const paidSum = await prisma.revenueRecord.aggregate({
      where: { vendorId, payout: { status: 'PAID' } },
      _sum: { vendorNet: true },
    });

    // 4. Billed (Pending Payment)
    const billedCount = await prisma.revenueRecord.count({
      where: {
        vendorId,
        payoutId: { not: null },
        payout: { status: { not: 'PAID' } },
      },
    });
    const billedSum = await prisma.revenueRecord.aggregate({
      where: {
        vendorId,
        payoutId: { not: null },
        payout: { status: { not: 'PAID' } },
      },
      _sum: { vendorNet: true },
    });

    // 5. Unprocessed (No Payout)
    const unprocessedCount = await prisma.revenueRecord.count({
      where: { vendorId, payoutId: null },
    });
    const unprocessedSum = await prisma.revenueRecord.aggregate({
      where: { vendorId, payoutId: null },
      _sum: { vendorNet: true },
    });

    console.log('------------------------------------------------');
    console.log(`Total Records: ${totalCount}`);
    console.log(`Total Earned:  ${totalEarned._sum.vendorNet}`);
    console.log('------------------------------------------------');
    console.log(`Paid Count:        ${paidCount}`);
    console.log(`Paid Sum:          ${paidSum._sum.vendorNet}`);
    console.log('------------------------------------------------');
    console.log(`Billed Count:      ${billedCount}`);
    console.log(`Billed Sum:        ${billedSum._sum.vendorNet}`);
    console.log('------------------------------------------------');
    console.log(`Unprocessed Count: ${unprocessedCount}`);
    console.log(`Unprocessed Sum:   ${unprocessedSum._sum.vendorNet}`);
    console.log('------------------------------------------------');

    const calculatedTotal =
      (paidSum._sum.vendorNet?.toNumber() || 0) +
      (billedSum._sum.vendorNet?.toNumber() || 0) +
      (unprocessedSum._sum.vendorNet?.toNumber() || 0);

    console.log(`Calculated Sum (Parts): ${calculatedTotal}`);
    console.log(
      `Difference: ${(totalEarned._sum.vendorNet?.toNumber() || 0) - calculatedTotal}`,
    );
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStats();
