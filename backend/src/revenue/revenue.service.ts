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
import { PayoutService } from '../payout/payout.service';
import { QuickbooksSyncService } from '../quickbooks/quickbooks.sync.service';
import { PLATFORM_STRATEGIES } from './config/platform-strategies.config';

@Injectable()
export class RevenueService {
  constructor(
    private readonly normalizationService: RevenueNormalizationService,
    private readonly matcherService: VendorMatcherService,
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
    private readonly qbSyncService: QuickbooksSyncService,
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

  // Helper to centralize parsing, normalization, and matching
  private async processReportData(
    file: Express.Multer.File,
    platformId: string,
    month: Date,
    mapping?: Record<string, string>,
  ) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: { mappingTemplate: true },
    });

    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    let usageMapping: Record<string, string> =
      (platform.mappingTemplate?.mappingRules as Record<string, string>) || {};

    let headerRowIndex = 0;

    if (mapping) {
      usageMapping = mapping;
      const rawRows = parseSheet(file.buffer, { raw: true });
      headerRowIndex = scanForHeader(rawRows);
      // Note: We do NOT save the template here. Separation of concerns.
    } else if (platform.mappingTemplate) {
      headerRowIndex = platform.mappingTemplate.headerRowIndex;
    } else {
      const rawRows = parseSheet(file.buffer, { raw: true });
      headerRowIndex = scanForHeader(rawRows);
    }

    const rawData = parseSheet(file.buffer, { headerRow: headerRowIndex });
    const hasMapping = Object.keys(usageMapping).length > 0;

    const normalizedData = rawData
      .map((row) => {
        // Fallback or legacy logic
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

        Object.keys(row).forEach((key) => {
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
            metadata[key] = row[key];
          }
        });

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
      .filter((row) => row !== null);

    const matchedData = await this.matcherService.matchVendors(normalizedData);

    return { params: { platform, headerRowIndex }, matchedData };
  }

  async dryRunRevenueReport(
    file: Express.Multer.File,
    platformId: string,
    month: Date,
    totalAmount: number | null,
    mapping?: Record<string, string>,
    invoiceNumber?: string,
  ) {
    // 1. Process Data (In-Memory)
    const {
      params: { platform },
      matchedData,
    } = await this.processReportData(file, platformId, month, mapping);

    // 2. Calculate Summary (In-Memory)
    // Need to fetch splits and vendor details for matched records
    const vendorIds = [
      ...new Set(matchedData.map((r) => r.vendorId).filter(Boolean)),
    ];
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds as string[] } },
    });
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    const splits = await this.prisma.platformSplit.findMany({
      where: {
        platformId: platform.id,
        vendorId: { in: vendorIds as string[] },
      },
    });
    const splitMap = new Map(splits.map((s) => [s.vendorId, s.commissionRate]));
    const defaultRate = platform.defaultSplit || 0;

    // Aggregate
    const summaryMap = new Map<string, any>();

    matchedData.forEach((row) => {
      // Must be matched to be in summary? Yes, likely.
      // But we should also show unmatched volume potentially?
      // For Step 3 Payout Review, we only care about who gets PAID (Matched).
      if (!row.vendorId) return;

      if (!summaryMap.has(row.vendorId)) {
        const vendor = vendorMap.get(row.vendorId);
        const rate = splitMap.has(row.vendorId)
          ? splitMap.get(row.vendorId)!
          : defaultRate;
        summaryMap.set(row.vendorId, {
          vendorId: row.vendorId,
          vendorName: vendor ? vendor.companyName : row.rawVendorName,
          gross: 0,
          commission: 0,
          net: 0,
          rate,
          qbVendorId: vendor?.qbVendorId || null,
        });
      }

      const entry = summaryMap.get(row.vendorId);
      const gross = Number(row.grossRevenue);
      entry.gross += gross;
      // Calculate Commission per row or total? Linear, so total is fine.
    });

    // Finalize Calculations
    const vendorsSummary = Array.from(summaryMap.values()).map((v) => {
      const commission = v.gross * v.rate;
      const net = v.gross - commission;
      return { ...v, commission, net };
    });

    return {
      reportId: null, // Indicates Dry Run
      invoiceRef: invoiceNumber || null,
      totalAmount: totalAmount,
      vendors: vendorsSummary,
    };
  }

  async saveRevenueReport(
    file: Express.Multer.File,
    platformId: string,
    month: Date,
    totalAmount: number | null,
    mapping?: Record<string, string>,
    invoiceNumber?: string,
    paymentStatus?: 'PAID' | 'PENDING',
  ) {
    // 1. Process Data
    const {
      params: { platform, headerRowIndex },
      matchedData,
    } = await this.processReportData(file, platformId, month, mapping);

    // 2. Persist Template (if mapping provided)
    if (mapping) {
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
    }

    // 3. Database Transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const report = await tx.revenueReport.create({
          data: {
            filename: file.originalname,
            rawFileUrl: '',
            status: 'PROCESSED', // DIRECTLY TO PROCESSED (Approved)
            platformId: platform.id,
            totalAmount: totalAmount,
            month: new Date(month),
            invoiceRef: invoiceNumber || null,
            paymentStatus: paymentStatus || 'PENDING',
          },
        });

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

      // 4. Trigger Sync (This is now the FINAL Step, so we auto-sync)
      // The user has already reviewed the dry run summary and clicked "Confirm & Sync"
      this.syncReport(result.reportId).catch((err) => {
        console.error(
          `[AutomatedSync] Failed to sync report ${result.reportId}`,
          err,
        );
      });

      return result;
    } catch (error) {
      console.error('CRITICAL ERROR in saveRevenueReport:', error);
      throw new InternalServerErrorException(
        `Failed to save revenue report: ${error.message}`,
      );
    }
  }

  async getReportSummary(reportId: string) {
    // 1. Fetch Report & Records
    const report = await this.prisma.revenueReport.findUnique({
      where: { id: reportId },
      include: {
        records: {
          include: {
            vendor: true,
            platform: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // 2. Aggregate by Vendor
    const vendorMap = new Map<
      string,
      {
        vendorId: string;
        vendorName: string;
        gross: number;
        commission: number;
        net: number;
        qbVendorId: string | null;
      }
    >();

    report.records.forEach((record) => {
      // Skip Unmatched for Payouts, but maybe show them?
      // Requirement says "showing all the vendors that were found..."
      // We focus on matched ones for payouts.
      if (!record.vendorId) return;

      if (!vendorMap.has(record.vendorId)) {
        vendorMap.set(record.vendorId, {
          vendorId: record.vendorId,
          vendorName:
            record.vendor?.companyName || record.rawVendorName || 'Unknown',
          gross: 0,
          commission: 0,
          net: 0,
          qbVendorId: record.vendor?.qbVendorId || null,
        });
      }

      const entry = vendorMap.get(record.vendorId)!;
      entry.gross += Number(record.grossRevenue);
      // We need to calculate commission if it's not already persisted?
      // In saveRevenueReport, we didn't calculate commission/net!
      // Wait, saveRevenueReport inserts records with `amgCommission: 0` (default).
      // We must calculate it NOW or used a stored procedure.
      // The current save logic DOES NOT calculate commission/net. It sets defaults.
      // The PayoutService.createPayout calculates it.
      // WE SHOULD CALCULATE IT HERE FOR PREVIEW.

      // We need to fetch splits to calculate accurately.
      // However, for the summary view, maybe we should just estimate or fetch stored?
      // Since it's 0 in DB, we must calculate.
    });

    // To calculate correctly, we need the logic from PayoutService.
    // Ideally, we should unify this.
    // For now, let's replicate the basic logic or depend on PayoutService if possible.
    // PayoutService.getUnpaidSummaries logic is complex.

    // Let's iterate and calculate properly.
    const platformId = report.platformId!;
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
    });
    const splits = await this.prisma.platformSplit.findMany({
      where: { platformId: platformId },
    });
    const splitMap = new Map(splits.map((s) => [s.vendorId, s.commissionRate]));

    const defaultRate = platform?.defaultSplit || 0;

    const summary = Array.from(vendorMap.values()).map((v) => {
      // Re-loop records for this vendor to be precise?
      // Or just apply to the aggregate gross?
      // Split is per Vendor/Platform. Since Report is single Platform, rate is constant for the Vendor.
      const rate = splitMap.has(v.vendorId)
        ? splitMap.get(v.vendorId)!
        : defaultRate;

      // Recalculate based on records
      const vendorRecords = report.records.filter(
        (r) => r.vendorId === v.vendorId,
      );
      const totalGross = vendorRecords.reduce(
        (sum, r) => sum + Number(r.grossRevenue),
        0,
      );

      const commission = totalGross * rate;
      const net = totalGross - commission;

      return {
        ...v,
        gross: totalGross,
        commission,
        net,
        rate,
      };
    });

    return {
      reportId: report.id,
      invoiceRef: report.invoiceRef,
      totalAmount: report.totalAmount,
      vendors: summary,
    };
  }

  // ... (existing methods remain, just need to ensure constructor is updated everywhere?
  // No, just the constructor and valid method usage.
  // Wait, I strictly cannot rely on `...` in replace_file_content when targeting a specific block like constructor!
  // I will replace constructor separately to be safe from file modification issues?)

  // Actually, I am replacing the constructor earlier in the file, so I need to target line 18-22.
  // I will make two calls. One for constructor, one for syncReport.
  // But cannot make parallel calls to same file.
  // I should use multi_replace for same file!
  // But wait, the previous tool call already used REPLACE.
  // I'll make this tools sequential in my thought process but effectively one turn?
  // No, I must queue them. But I can assume I can do it in one MultiReplace.
  // Wait, I will use Replace for the constructor first?
  // Let's look at file again.
  // Line 18 is constructor.
  // Line 365 is syncReport.

  // I will use MultiReplaceFileContent.

  // Wait, I am currently running inside a thought block before tool calls.
  // I already queued `replace_file_content` for QuickbooksSyncService (Step 1).
  // Then `replace_file_content` for imports (Step 2).
  // I should queue `multi_replace_file_content` for RevenueService constructor + syncReport (Step 3).

  // Wait, I should verify exact lines for constructor.
  // Lines 18-22
  // constructor(
  //   private readonly normalizationService: RevenueNormalizationService,
  //   private readonly matcherService: VendorMatcherService,
  //   private readonly prisma: PrismaService,
  // ) {}

  // Implementation of syncReport:

  async syncReport(reportId: string, invoiceRef?: string) {
    const report = await this.prisma.revenueReport.findUnique({
      where: { id: reportId },
      include: { records: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // 1. Update Invoice Ref if provided
    // Also, if invoiceRef is empty, try to ensure we have one?
    const finalInvoiceRef = invoiceRef || report.invoiceRef;
    if (invoiceRef) {
      await this.prisma.revenueReport.update({
        where: { id: reportId },
        data: { invoiceRef },
      });
    }

    // 2. Identify Vendors & Records to Pay
    // We only pay records that are "UNPROCESSED" (just uploaded) or "MATCHED"
    // And NOT yet paid (payoutId is null).

    // Group records by Vendor
    const vendorRecordsMap = new Map<string, string[]>();
    report.records.forEach((r) => {
      if (
        r.vendorId &&
        !r.payoutId &&
        (r.status === 'MATCHED' || r.status === 'UNPROCESSED')
      ) {
        if (!vendorRecordsMap.has(r.vendorId)) {
          vendorRecordsMap.set(r.vendorId, []);
        }
        vendorRecordsMap.get(r.vendorId)!.push(r.id);
      }
    });

    const results: any[] = [];
    const errors: any[] = [];

    // 3. Loop Vendors
    for (const [vendorId, recordIds] of vendorRecordsMap.entries()) {
      try {
        // a. Create Payout (Local)
        const payout = await this.payoutService.createPayout({
          vendorId,
          recordIds,
        });

        // b. Create QBO Bill (Sync)
        // We catch errors here so one failure doesn't stop others?
        // Admin likely wants "All or Nothing" or "Best Effort"?
        // Usually Best Effort with Error Report is better for Bulk.
        let bill: any = null;
        let syncError = null;
        try {
          bill = await this.qbSyncService.createBillFromPayout(
            payout.payoutId,
            finalInvoiceRef || undefined,
          );
        } catch (e) {
          console.error(`Failed to sync payout ${payout.payoutId} to QBO`, e);
          syncError = e.message;
          // If sync fails, should we rollback payout?
          // Probably not, they can retry sync later?
          // The payout exists. Status is "NOT_SYNCED" (default).
        }

        results.push({
          vendorId,
          payoutId: payout.payoutId,
          amount: payout.totalAmount,
          qbBillId: bill?.Id || null,
          syncStatus: bill ? 'SUCCESS' : 'FAILED',
          syncError,
        });
      } catch (e) {
        console.error(`Failed to process vendor ${vendorId}`, e);
        errors.push({ vendorId, error: e.message });
      }
    }

    return {
      message: 'Sync process completed',
      reportId,
      processed: results.length,
      failures: errors.length,
      details: results,
      errors,
    };
  }

  async saveManualReport(dto: CreateManualReportDto) {
    const { platformId, month, totalAmount, rows, invoiceNumber } = dto;

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
      const result = await this.prisma.$transaction(async (tx) => {
        const report = await tx.revenueReport.create({
          data: {
            filename: 'Platform Total',
            rawFileUrl: '', // No physical file
            status: 'PROCESSED',
            platformId: platform.id,
            totalAmount: totalAmount,
            month: new Date(month),
            invoiceRef: invoiceNumber || null,
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
            lineItemName: row.lineItemName || 'Platform Total',
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

      // AUTOMATED SYNC: Immediately try to sync the report (Best Effort)
      this.syncReport(result.reportId).catch((err) => {
        console.error(
          `[AutomatedSync] Failed to sync manual report ${result.reportId}`,
          err,
        );
      });

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to save manual report: ${error.message}`,
      );
    }
  }
  async deleteUnpaidRecords(vendorId: string) {
    const result = await this.prisma.revenueRecord.deleteMany({
      where: {
        vendorId: vendorId,
        payoutId: null, // Ensure we only delete unpaid records
      },
    });

    return {
      message: 'Unpaid records deleted successfully',
      count: result.count,
    };
  }
}
