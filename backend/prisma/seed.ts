import { PrismaClient } from './generated/client';
import { PayoutMethod } from './generated/enums';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$connect();
  console.log('🌱 Starting seed...');

  // 1. Create Platforms
  const platforms = [
    { name: 'Test_Platform_1', defaultSplit: 20 },
    { name: 'Test_platform_2', defaultSplit: 20 },
    { name: 'Test_platform_3', defaultSplit: 25 },
    { name: 'Test_platform_4', defaultSplit: 30 },
  ];

  for (const plat of platforms) {
    await prisma.platform.upsert({
      where: { name: plat.name },
      update: {},
      create: {
        name: plat.name,
        defaultSplit: plat.defaultSplit,
      },
    });
  }
  console.log('✅ Platforms seeded');

  // 2. Create Vendors with Banking Info
  const salt = await bcrypt.genSalt();
  const password = await bcrypt.hash('Password123!', salt);

  const vendors = [
    {
      companyName: 'Test_Vendor_1',
      contactName: 'John Doe',
      email: 'john@acme.com',
      vendorNumber: 'V001',
      subLabels: ['AcmeXXX', 'AcmeTeens'],
      bank: {
        bankName: 'Chase',
        accountNumber: '1234567890',
        payoutMethod: PayoutMethod.ACH,
        currency: 'USD',
      },
    },
    {
      companyName: 'Star Content LLC',
      contactName: 'Jane Smith',
      email: 'jane@star.com',
      vendorNumber: 'V002',
      subLabels: ['StarOriginals'],
      bank: {
        bankName: 'PayPal',
        accountNumber: 'N/A', // Not needed for PayPal really
        payoutMethod: PayoutMethod.PAYPAL,
        paypalEmail: 'jane@star.com',
        currency: 'USD',
      },
    },
    {
      companyName: 'Global Media Group',
      contactName: 'Robert Brown',
      email: 'robert@global.com',
      vendorNumber: 'V003',
      subLabels: ['GlobalBlue', 'GlobalRed'],
      bank: {
        bankName: 'Bank of America',
        accountNumber: '987654321',
        payoutMethod: PayoutMethod.WIRE,
        currency: 'EUR',
        swiftCode: 'BOFAUS3N',
      },
    },
  ];

  for (const v of vendors) {
    const createdVendor = await prisma.vendor.upsert({
      where: { email: v.email },
      update: {},
      create: {
        companyName: v.companyName,
        contactName: v.contactName,
        email: v.email,
        vendorNumber: v.vendorNumber,
        password,
        subLabels: v.subLabels,
        bankDetails: {
          create: {
            bankName: v.bank.bankName,
            accountNumber: v.bank.accountNumber,
            payoutMethod: v.bank.payoutMethod,
            currency: v.bank.currency,
            paypalEmail: v.bank.paypalEmail,
            swiftCode: v.bank.swiftCode,
          },
        },
      },
    });

    // 3. Add Splits
    const platformList = await prisma.platform.findMany();
    if (platformList.length > 0) {
      // Assign random split to first platform
      await prisma.platformSplit
        .create({
          data: {
            vendorId: createdVendor.id,
            platformId: platformList[0].id,
            commissionRate: 15.0, // Special deal
          },
        })
        .catch(() => {}); // Ignore duplicate errors if running seed multiple times
    }
  }

  console.log('✅ Vendors and Splits seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
