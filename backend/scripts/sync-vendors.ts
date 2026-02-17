import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from 'prisma/generated/client';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = path.join(__dirname, '../../non-email.csv');
  console.log(`Reading file from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} records in CSV.`);

  let updatedCount = 0;
  let createdCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const row of data) {
    try {
      const id = row['id'];
      const vendorNumber = row['vendorNumber'];
      const companyName = row['companyName'];
      const contactName = row['contactName'];
      const email = row['email'];
      const password = row['password']; // Should be hashed?
      let phone = row['phone'];
      let address = row['address'];
      const contractSignatory = row['contractSignatory'];
      const subLabelsRaw = row['subLabels'];
      const qbVendorId = row['qbVendorId'] ? String(row['qbVendorId']) : null;
      const corporateName = row['corporateName'];
      const dbaName = row['dbaName'];
      const taxId = row['taxId'];

      // CLEANUP
      if (phone && typeof phone === 'number') {
        phone = String(phone); // Handle scientific notation if excel parsed it as number
      }
      if (phone === '#ERROR!') phone = null;

      if (address !== undefined && address !== null) {
        address = String(address);
      }

      let subLabels: string[] = [];
      if (subLabelsRaw) {
        if (typeof subLabelsRaw === 'string') {
          try {
            subLabels = JSON.parse(subLabelsRaw);
          } catch (e) {
            // If simple string, wrap in array? Or just ignore?
            // CSV example: ["Nico Grey"] -> works
            // invalid: ["A",]
            console.warn(
              `Could not parse subLabels for ${companyName}: ${subLabelsRaw}`,
            );
          }
        }
      }

      const vendorData = {
        vendorNumber: vendorNumber ? String(vendorNumber).trim() : undefined,
        companyName: companyName ? String(companyName).trim() : undefined,
        contactName: contactName ? String(contactName).trim() : undefined,
        email: email ? String(email).trim() : undefined,
        password: password, // Note: If this is plain text 'temp_password_change_me', it will save as such.
        phone: phone ? String(phone).trim() : undefined,
        address: address ? String(address).trim() : undefined,
        contractSignatory: contractSignatory
          ? String(contractSignatory).trim()
          : undefined,
        subLabels: subLabels,
        qbVendorId: qbVendorId,
        corporateName: corporateName ? String(corporateName).trim() : undefined,
        dbaName: dbaName ? String(dbaName).trim() : undefined,
        taxId: taxId ? String(taxId).trim() : undefined,
      };

      let existing: any = null;
      if (id) {
        existing = await prisma.vendor.findUnique({ where: { id } });
      }

      if (!existing && (vendorData.vendorNumber || vendorData.email)) {
        // Fallback: If ID provided but not found, OR no ID provided -> Check strict fields
        existing = await prisma.vendor.findFirst({
          where: {
            OR: [
              vendorData.vendorNumber
                ? { vendorNumber: vendorData.vendorNumber }
                : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (existing) {
        // UPDATE
        await prisma.vendor.update({
          where: { id: existing.id },
          data: vendorData,
        });
        console.log(
          `Updated vendor: ${vendorData.companyName} (${existing.id})`,
        );
        updatedCount++;
      } else {
        // CREATE
        // If we are here, ID was not found, and vendorNumber/email not found.
        // We can safely create.
        // If ID was provided in CSV, we use it. If not, Prisma generates UUID.
        console.log(`Creating NEW vendor: ${vendorData.companyName}`);
        await prisma.vendor.create({
          data: {
            ...vendorData,
            id: id || undefined, // Use CSV ID if available
          } as any,
        });
        createdCount++;
      }
    } catch (error) {
      const errorMsg = `Failed to process row for ${row['companyName'] || 'Unknown'}: ${error instanceof Error ? error.message : String(error)}\n`;
      console.error(errorMsg);
      fs.appendFileSync(path.join(__dirname, 'sync-errors.log'), errorMsg);
      errorCount++;
    }
  }

  console.log('--- SYNC COMPLETE ---');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
