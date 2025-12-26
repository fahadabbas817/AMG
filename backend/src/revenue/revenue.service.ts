import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { parseSheet, scanForHeader } from './utils/universal-parser.util';
import { RevenueNormalizationService } from './revenue-normalization.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { CreateManualReportDto } from './dto/create-manual-report.dto';
import { PLATFORM_STRATEGIES } from './config/platform-strategies.config';

@Injectable()
export class RevenueService {
  constructor(
    private readonly normalizationService: RevenueNormalizationService,
    private readonly matcherService: VendorMatcherService,
    private readonly prisma: PrismaService,
  ) {}

  async previewRevenueReport(file: Express.Multer.File, platformId: string) {
    // 1. Get Platform
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: { mappingTemplate: true },
    });
    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    // 2. Parse Raw Data (Array of Arrays)
    const rawRows = parseSheet(file.buffer, { raw: true });

    // 3. Smart Scan for Header
    let headerRowIndex = -1;
    // Check if we have a saved template
    if (platform.mappingTemplate) {
      headerRowIndex = platform.mappingTemplate.headerRowIndex;
    } else {
      // Auto-detect
      headerRowIndex = scanForHeader(rawRows);
    }

    let detectedHeaders: string[] = [];
    let sampleRows: any[] = [];

    // If header found, extract it and sample rows
    if (headerRowIndex !== -1 && headerRowIndex < rawRows.length) {
      detectedHeaders = rawRows[headerRowIndex] as string[];
      // Get next 5 rows as sample data
      sampleRows = rawRows.slice(headerRowIndex + 1, headerRowIndex + 6);
    } else {
      // Return top 10 raw rows for manual selection
      sampleRows = rawRows.slice(0, 10);
    }

    // 4. Suggested Mapping
    let suggestedMapping = {};
    if (platform.mappingTemplate) {
      suggestedMapping = platform.mappingTemplate.mappingRules as Record<
        string,
        string
      >;
    }

    return {
      message: 'Smart Scan complete',
      platform: platform.name,
      fileName: file.originalname,
      headerRowIndex,
      detectedHeaders,
      sampleRows,
      suggestedMapping,
    };
  }

  async saveRevenueReport(
    file: Express.Multer.File,
    platformId: string,
    month: Date,
    totalAmount: number | null,
    mapping?: Record<string, string>, // Optional new mapping
    invoiceNumber?: string,
    paymentStatus?: 'PAID' | 'PENDING',
  ) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: { mappingTemplate: true },
    });

    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    // 0. If new mapping is provided, Upsert the Template
    let usageMapping: Record<string, string> =
      (platform.mappingTemplate?.mappingRules as Record<string, string>) || {};

    let headerRowIndex = 0;

    if (mapping) {
      // We assume if mapping is provided, we should update the template
      usageMapping = mapping;

      // Detect header row index again to be safe, or use the one implicitly used for mapping
      // For now, let's auto-detect to store the correct index
      const rawRows = parseSheet(file.buffer, { raw: true });
      headerRowIndex = scanForHeader(rawRows);

      // Save to DB
      await this.prisma.platformMappingTemplate.upsert({
        where: { platformId: platform.id },
        create: {
          platformId: platform.id,
          mappingRules: mapping,
          headerRowIndex: headerRowIndex,
        },
        update: {
          mappingRules: mapping,
          headerRowIndex: headerRowIndex,
        },
      });
    } else if (platform.mappingTemplate) {
      // Use existing
      headerRowIndex = platform.mappingTemplate.headerRowIndex;
    } else {
      // Auto-detect if no mapping and no template
      const rawRows = parseSheet(file.buffer, { raw: true });
      headerRowIndex = scanForHeader(rawRows);
    }

    // Now parse properly using the header row
    const rawData = parseSheet(file.buffer, { headerRow: headerRowIndex });

    // Normalize Data (Greedy Extraction) using the determined usageMapping
    // const usageMapping = ... (already defined above)
    const hasMapping = Object.keys(usageMapping).length > 0;

    const normalizedData = rawData
      .map((row) => {
        // Fallback for legacy strategy ONLY if no mapping template exists AND no dynamic mapping
        if (!hasMapping && !platform.mappingTemplate) {
          const result = this.normalizationService.normalize(
            [row],
            platform.name,
          );
          return result.length > 0 ? result[0] : null;
        }

        const metadata: Record<string, any> = {};
        let grossRevenue = 0;
        let lineItemName = '';
        let rawVendorName = '';

        // Iterate all keys in the row
        Object.keys(row).forEach((key) => {
          // usageMapping is { field: column }, so we find which field maps to this key (column)
          const mappedFieldEntry = Object.entries(usageMapping).find(
            ([_, col]) => col === key,
          );
          const mappedField = mappedFieldEntry ? mappedFieldEntry[0] : null;

          if (mappedField === 'grossRevenue') {
            grossRevenue = parseFloat(row[key]) || 0;
          } else if (mappedField === 'lineItemName') {
            lineItemName = row[key];
          } else if (mappedField === 'rawVendorName') {
            rawVendorName = row[key];
          } else {
            // Greedy Capture
            metadata[key] = row[key];
          }
        });

        // Basic validation: If no revenue and no vendor, likely a trash row
        if (!rawVendorName && grossRevenue === 0) {
          return null;
        }

        return {
          grossRevenue,
          lineItemName,
          rawVendorName,
          metadata,
          periodStart: new Date(month),
          periodEnd: new Date(month),
          status: 'UNPROCESSED',
          originalRow: row,
        };
      })
      .filter((row) => row !== null); // Remove garbage rows

    // Match Vendors
    const matchedData = await this.matcherService.matchVendors(normalizedData);

    // 2. Database Transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create Report Header
        const report = await tx.revenueReport.create({
          data: {
            filename: file.originalname,
            rawFileUrl: '', // No longer saving file to disk
            status: 'PROCESSED',
            platformId: platform.id,
            totalAmount: totalAmount,
            month: new Date(month),
            invoiceRef: invoiceNumber || null,
            paymentStatus: paymentStatus || 'PENDING',
          },
        });

        // Create Records
        await tx.revenueRecord.createMany({
          data: matchedData.map((row) => ({
            reportId: report.id,
            vendorId: row.vendorId,
            rawVendorName: row.rawVendorName,
            platformId: platform.id,
            periodStart: new Date(month),
            periodEnd: new Date(month),
            grossRevenue: row.grossRevenue,
            lineItemName: row.lineItemName,
            metadata: row.metadata,
            rawLineData: row.originalRow,
            status: row.status,
          })),
        });

        return {
          message: 'Revenue report saved successfully',
          reportId: report.id,
          totalRecords: matchedData.length,
        };
      });
    } catch (error) {
      console.error('CRITICAL ERROR in saveRevenueReport:', error);
      throw new InternalServerErrorException(
        `Failed to save revenue report: ${error.message}`,
      );
    }
  }

  async saveManualReport(dto: CreateManualReportDto) {
    const { platformId, month, totalAmount, rows } = dto;

    // 1. Validate Platform
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
    });
    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    // 2. Validate Sum
    const sum = rows.reduce((acc, row) => acc + Number(row.grossRevenue), 0);
    const difference = Math.abs(sum - totalAmount);
    // Floating point epsilon check (allow a small margin of error like 0.02)
    if (difference > 0.02) {
      throw new BadRequestException(
        `Sum validation failed: Rows sum to ${sum}, but Header Total is ${totalAmount}.`,
      );
    }

    // 3. Strict Vendor Validation & Name Lookup
    const uniqueVendorIds = [...new Set(rows.map((r) => r.vendorId))];

    // Fetch all referenced vendors
    const existingVendors = await this.prisma.vendor.findMany({
      where: {
        id: { in: uniqueVendorIds },
      },
      select: { id: true, companyName: true },
    });

    // Check for missing IDs
    const foundIds = new Set(existingVendors.map((v) => v.id));
    const missingIds = uniqueVendorIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Invalid vendor IDs provided: ${missingIds.join(', ')}`,
      );
    }

    // Create a lookup map for fast access: ID -> Company Name
    const vendorMap = new Map<string, string>();
    existingVendors.forEach((v) => vendorMap.set(v.id, v.companyName));

    const processedRows = rows.map((row) => {
      const vendorName = vendorMap.get(row.vendorId);
      return {
        ...row,
        vendorId: row.vendorId,
        vendorName: vendorName!, // Assert non-null because we validated strict existence above
        status: 'MATCHED',
      };
    });

    // 4. Transactional Save
    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await tx.revenueReport.create({
          data: {
            filename: 'MANUAL_ENTRY',
            rawFileUrl: '', // No physical file
            status: 'PROCESSED',
            platformId: platform.id,
            totalAmount: totalAmount,
            month: new Date(month),
          },
        });

        await tx.revenueRecord.createMany({
          data: processedRows.map((row) => ({
            reportId: report.id,
            vendorId: row.vendorId || null,
            rawVendorName: row.vendorName,
            platformId: platform.id,
            periodStart: new Date(month),
            periodEnd: new Date(month),
            grossRevenue: row.grossRevenue,
            lineItemName: row.lineItemName || 'Manual Entry',
            status: row.status,
            metadata: {},
          })),
        });

        return {
          message: 'Manual report saved successfully',
          reportId: report.id,
          totalRecords: processedRows.length,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to save manual report: ${error.message}`,
      );
    }
  }
}
