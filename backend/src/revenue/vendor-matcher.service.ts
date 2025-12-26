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

    // 2. Build a lookup map: normalized sublabel -> vendorId
    // NORMALIZATION RULE: trim().toLowerCase()
    const subLabelMap = new Map<string, string>();

    for (const vendor of vendors) {
      if (vendor.subLabels && Array.isArray(vendor.subLabels)) {
        for (const label of vendor.subLabels) {
          const normalizedLabel = label.trim().toLowerCase();
          if (normalizedLabel) {
            subLabelMap.set(normalizedLabel, vendor.id);
          }
        }
      }
    }

    // 3. Iterate and match
    return normalizedRows.map((row) => {
      if (!row.rawVendorName) {
        return { ...row, vendorId: null, status: 'UNMATCHED' };
      }

      // Pre-process the raw vendor string
      const rawString = String(row.rawVendorName);

      // Strategy: Split by comma, then try to match EACH part.
      // Rule: "map the record to the first one that we found"
      const parts = rawString.split(',');

      let matchedVendorId: string | undefined;

      for (const part of parts) {
        const normalizedPart = part.trim().toLowerCase();
        if (subLabelMap.has(normalizedPart)) {
          matchedVendorId = subLabelMap.get(normalizedPart);
          break; // Stop at the first match found
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
