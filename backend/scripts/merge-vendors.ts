import { PrismaClient } from 'prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// You can manually add pairs here.
// Format: { keepId: 'UUID', deleteId: 'UUID' }
const MANUAL_PAIRS: { keepId: string; deleteId: string }[] = [
  // EXAMPLE:
  // { keepId: 'winner-uuid', deleteId: 'loser-uuid' },
  {
    keepId: '27e93565-c29e-4b82-9a11-b76899db91ac',
    deleteId: '4f7e1d24-c6c1-4dfd-bc6b-c7059f602596',
  },
  {
    keepId: '2a5404f1-6137-4369-8a81-d419171c58d6',
    deleteId: '872a69cd-63b2-43e2-ba6a-78a5beb85431',
  },
  {
    keepId: 'a17158fc-2fbf-4888-851e-d6d9e2c27e9f',
    deleteId: '5969a634-de83-48e9-8465-fa86d0b21f17',
  },
  {
    keepId: '9dc5b51e-eca6-4165-a15c-7887273fe18c',
    deleteId: 'b2cfb8ce-ea54-4e77-bbb2-d719dc76b074',
  },
  {
    keepId: 'dd030a17-e46f-49a3-957f-7b56f3c3ca45',
    deleteId: '37fa2f3e-cbe6-4145-bf65-d09606bcd9a4',
  },
  {
    keepId: '830c438d-f1aa-4dcb-9dd5-509a2e73cb49',
    deleteId: '44e363d2-a7ad-4189-b398-64939f87c522',
  },
  {
    keepId: '4565dfed-1440-402c-8fa4-8a26f615fdb5',
    deleteId: 'db49588e-37b1-433f-b2cc-8469e9b50ae5',
  },
];

async function main() {
  console.log('Starting Vendor Merge Process...');

  const pairs = [...MANUAL_PAIRS];

  if (pairs.length === 0) {
    console.warn(
      'No merge pairs found! Please populate the MANUAL_PAIRS array in this script.',
    );
    return;
  }

  console.log(`Found ${pairs.length} pairs to merge.`);

  for (const pair of pairs) {
    await mergeVendor(pair.keepId, pair.deleteId);
  }

  console.log('--- MERGE COMPLETE ---');
}

async function mergeVendor(keepId: string, deleteId: string) {
  console.log(`\nProcessing Merge: Keep ${keepId}, Delete ${deleteId}`);

  if (keepId === deleteId) {
    console.error('Skipping: valid and duplicate IDs are the same.');
    return;
  }

  try {
    const keepVendor = await prisma.vendor.findUnique({
      where: { id: keepId },
      include: { bankDetails: true },
    });
    const deleteVendor = await prisma.vendor.findUnique({
      where: { id: deleteId },
      include: { bankDetails: true },
    });

    if (!keepVendor || !deleteVendor) {
      console.error(
        `Skipping: One or both vendors not found (Keep: ${!!keepVendor}, Delete: ${!!deleteVendor})`,
      );
      return;
    }

    console.log(
      `Merging '${deleteVendor.companyName}' INTO '${keepVendor.companyName}'`,
    );

    await prisma.$transaction(async (tx) => {
      // 1. UPDATE FIELDS
      // If keepVendor has null/empty fields, take from deleteVendor
      const updateData: any = {};
      const fieldsToCheck = [
        'vendorNumber',
        'contactName',
        'email',
        'phone',
        'address',
        'contractSignatory',
        'qbVendorId',
        'corporateName',
        'dbaName',
        'taxId',
      ];

      for (const field of fieldsToCheck) {
        const keepVal = (keepVendor as any)[field];
        const delVal = (deleteVendor as any)[field];
        if (
          (keepVal === null || keepVal === undefined || keepVal === '') &&
          delVal !== null &&
          delVal !== undefined &&
          delVal !== ''
        ) {
          updateData[field] = delVal;
        }
      }

      // SubLabels - Merge unique
      // SubLabels - No merging, just fill if empty
      if (
        keepVendor.subLabels.length === 0 &&
        deleteVendor.subLabels.length > 0
      ) {
        updateData.subLabels = deleteVendor.subLabels;
      }

      if (Object.keys(updateData).length > 0) {
        console.log(
          'Updating fields on Target vendor:',
          Object.keys(updateData),
        );
        await tx.vendor.update({
          where: { id: keepId },
          data: updateData,
        });
      }

      // 2. MOVE ONE-TO-MANY RELATIONS (Simple)
      // RevenueRecords
      const revUpdate = await tx.revenueRecord.updateMany({
        where: { vendorId: deleteId },
        data: { vendorId: keepId },
      });
      console.log(`Moved ${revUpdate.count} RevenueRecords.`);

      // Payouts
      const payoutUpdate = await tx.payout.updateMany({
        where: { vendorId: deleteId },
        data: { vendorId: keepId },
      });
      console.log(`Moved ${payoutUpdate.count} Payouts.`);

      // ProfileChangeRequests
      const profileUpdate = await tx.profileChangeRequest.updateMany({
        where: { vendorId: deleteId },
        data: { vendorId: keepId },
      });
      console.log(`Moved ${profileUpdate.count} ProfileChangeRequests.`);

      // 3. HANDLE PLATFORM SPLITS (Unique Constraint Possible)
      const sourceSplits = await tx.platformSplit.findMany({
        where: { vendorId: deleteId },
      });
      for (const split of sourceSplits) {
        // Check if target already has this platform
        const existingSplit = await tx.platformSplit.findUnique({
          where: {
            vendorId_platformId: {
              vendorId: keepId,
              platformId: split.platformId,
            },
          },
        });

        if (existingSplit) {
          // Target has it, so we delete source's duplicate to avoid conflict
          console.log(
            `Conflict on PlatformSplit ${split.platformId} - Keeping Target's.`,
          );
        } else {
          // Target doesn't have it, move source's
          await tx.platformSplit.update({
            where: { id: split.id },
            data: { vendorId: keepId },
          });
          console.log(`Moved PlatformSplit ${split.platformId}.`);
        }
      }
      // Delete leftover splits from source (duplicates)
      await tx.platformSplit.deleteMany({ where: { vendorId: deleteId } });

      // 4. HANDLE BANK DETAILS (One-to-One)
      if (deleteVendor.bankDetails) {
        if (!keepVendor.bankDetails) {
          // Move it
          await tx.bankDetails.update({
            where: { id: deleteVendor.bankDetails.id },
            data: { vendorId: keepId },
          });
          console.log('Moved BankDetails.');
        } else {
          // Target has one, keep it. Source's will be deleted via cascade or manual delete
          console.log("Target has BankDetails. Deleting Source's.");
          await tx.bankDetails.delete({
            where: { id: deleteVendor.bankDetails.id },
          });
        }
      }

      // 5. DELETE SOURCE VENDOR
      await tx.vendor.delete({
        where: { id: deleteId },
      });
      console.log('Deleted source vendor.');
    });
    console.log('Merge Successful.');
  } catch (e) {
    console.error(`Failed to merge ${deleteId} into ${keepId}:`, e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
