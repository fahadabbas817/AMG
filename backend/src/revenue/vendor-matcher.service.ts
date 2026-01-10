import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async matchVendors(normalizedRows: any[]) {
    // 1. Fetch all vendors and their subLabels
    const vendors = await this.prisma.vendor.findMany({
      select: {
        id: true,
        subLabels: true,
      },
    });

    // Step 1: Update the Data Retrieval Logic & Step 4: Handle Many-to-One Relationships
    const aliasToVendorMap = new Map<string, string>();

    // Step 2: Implement Robust Matching (Case-Insensitive + Ignore Spaces)
    // We strip all spaces to ensure "Porn Mega Load" matches "PornMegaLoad"
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');

    for (const vendor of vendors) {
      if (vendor.subLabels && Array.isArray(vendor.subLabels)) {
        for (const label of vendor.subLabels) {
          const normalizedLabel = normalize(label);
          if (normalizedLabel) {
            aliasToVendorMap.set(normalizedLabel, vendor.id);
          }
        }
      }
    }

    // Step 3: Refactor the Parsing Loop
    return normalizedRows.map((row) => {
      if (!row.rawVendorName) {
        return { ...row, vendorId: null, status: 'UNMATCHED' };
      }

      const rawString = String(row.rawVendorName);

      // We still split by common separators to handle cases where multiple studios might be listed
      // or if the field contains noise like dates or IDs separated by pipes/slashes.
      // However, we check each part against our normalized map.
      const parts = rawString.split(/[,|/;-]+/);
      let matchedVendorId: string | undefined;

      for (const part of parts) {
        const key = normalize(part);

        if (aliasToVendorMap.has(key)) {
          matchedVendorId = aliasToVendorMap.get(key);
          break; // Stop at first valid match
        }
      }

      return {
        ...row,
        vendorId: matchedVendorId || null,
        status: matchedVendorId ? 'MATCHED' : 'UNMATCHED',
      };
    });
  }
}
