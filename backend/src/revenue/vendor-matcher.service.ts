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
        vendorNumber: true, // Needed for Tier 1 matching
        subLabels: true,
      },
    });

    // Step 1: Update the Data Retrieval Logic & Step 4: Handle Many-to-One Relationships
    const aliasToVendorMap = new Map<string, string>(); // sublabels -> vendorId
    const numberToVendorMap = new Map<string, string>(); // vendorNumber -> vendorId

    // Step 2: Implement Robust Matching (Case-Insensitive + Ignore Spaces)
    // We strip all spaces to ensure "Porn Mega Load" matches "PornMegaLoad"
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');

    for (const vendor of vendors) {
      // Build ID Map (Tier 1)
      if (vendor.vendorNumber) {
        // Normalize vendor number too? usually strict, but trimming is safe.
        numberToVendorMap.set(vendor.vendorNumber.trim(), vendor.id);
      }

      // Build Sublabel Map (Tier 2)
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
      // 0. Pre-validation
      if (!row.rawVendorName && !row.csvVendorId) {
        // If neither name nor ID exists, we can't match.
        return { ...row, vendorId: null, status: 'UNMATCHED' };
      }

      let matchedVendorId: string | undefined;

      // --- TIER 1: Vendor ID Match (Priority) ---
      if (row.csvVendorId) {
        const checkId = String(row.csvVendorId).trim();
        if (numberToVendorMap.has(checkId)) {
          matchedVendorId = numberToVendorMap.get(checkId);
        }
      }

      // --- TIER 2: Fuzzy Sublabel Match (Fallback) ---
      if (!matchedVendorId && row.rawVendorName) {
        const rawString = String(row.rawVendorName);
        // Split by common separators to handle combined fields or noise
        const parts = rawString.split(/[,|/;-]+/);

        for (const part of parts) {
          const key = normalize(part);
          if (aliasToVendorMap.has(key)) {
            matchedVendorId = aliasToVendorMap.get(key);
            break; // Stop at first valid match
          }
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
