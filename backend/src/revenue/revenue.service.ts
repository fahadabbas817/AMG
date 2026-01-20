import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
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
    const autoHeaderIndex = scanForHeader(rawRows);
    let headerRowIndex = autoHeaderIndex;

    // Check if we have a saved template
    if (platform.mappingTemplate) {
      const templateIndex = platform.mappingTemplate.headerRowIndex;
      // If template index is valid
      if (templateIndex < rawRows.length) {
        // Compare scores to decide whether to trust template or auto-scan
        // We need calculateRowScore imported from universal-parser
        const { calculateRowScore } = require('./utils/universal-parser.util');
        const templateScore = calculateRowScore(rawRows[templateIndex]);
        const autoScore = calculateRowScore(rawRows[autoHeaderIndex]);

        // Trust template UNLESS auto-scan is significantly better
        // And if template score is very low (e.g. 0 or 1 like a title row)
        // If template score is >= 2, we respect it (user might have chosen a weird header)
        // But if template score < 2 AND auto > template, we switch.
        // Actually, for this specific case: Template=0 (Title="Dec...", score=0 or 1), Auto=1 (Header, score=6).
        console.log(
          `[SmartScan] Template Index: ${templateIndex} (Score: ${templateScore}) | Auto Index: ${autoHeaderIndex} (Score: ${autoScore})`,
        );

        // Override if Auto-Scan is significantly better (diff >= 2)
        // OR if Auto-Scan is better match and template score is low (< 3)
        // This handles:
        // Case 1: Title Row (Score ~3) vs Header Row (Score ~8) -> 8 > 3+2 (True) -> Override
        // Case 2: Metadata Row (Score ~2) vs Header Row (Score ~6) -> 6 > 2+2 (True) -> Override
        // Case 3: Valid Header A (Score 6) vs Valid Header B (Score 6) -> No Override
        if (autoScore > templateScore + 2) {
          console.warn(
            `[SmartScan] Overriding Template (Index ${templateIndex}) with Auto-Detected (Index ${autoHeaderIndex}) due to better score.`,
          );
          headerRowIndex = autoHeaderIndex;
        } else {
          headerRowIndex = templateIndex;
        }
      }
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
          } else if (mappedField === 'vendorId') {
            // NEW: Extract Vendor ID for Tier 1 matching
            metadata['csvVendorId'] = row[key]; // Store temporarily in metadata or separate field?
            // Let's allow it to be a top-level property on the object passed to Matcher
          } else {
            metadata[key] = row[key];
          }
        });

        // We attach csvVendorId to the object
        const csvVendorId =
          (usageMapping['vendorId'] && row[usageMapping['vendorId']]) || null;

        if (!rawVendorName && grossRevenue === 0) {
          return null;
        }

        return {
          grossRevenue,
          lineItemName,
          rawVendorName,
          csvVendorId, // PASSED TO MATCHER
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
    const unmatchedMap = new Map<string, any>(); // Group Unmatched by SubLabel

    matchedData.forEach((row) => {
      // Must be matched to be in summary? Yes, likely.
      // For Step 3 Payout Review, we only care about who gets PAID (Matched).
      if (!row.vendorId) {
        const key = row.rawVendorName || 'Unknown';
        if (!unmatchedMap.has(key)) {
          unmatchedMap.set(key, {
            rawVendorName: key,
            grossRevenue: 0,
            count: 0,
            status: 'UNMATCHED',
          });
        }
        const entry = unmatchedMap.get(key);
        entry.grossRevenue += Number(row.grossRevenue);
        entry.count += 1;
        return;
      }

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

    // Aggregated Unmatched Items
    const unmatchedItems = Array.from(unmatchedMap.values()).sort(
      (a, b) => b.grossRevenue - a.grossRevenue,
    );

    return {
      reportId: null, // Indicates Dry Run
      invoiceRef: invoiceNumber || null,
      totalAmount: totalAmount,
      vendors: vendorsSummary,
      unmatched: unmatchedItems, // Return for Frontend
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
    // 1. Calculate Fingerprint (SHA-256 of header + first 5 rows)
    // We use a partial content hash to detect "Same Content" even if filename differs,
    // OR we can just hash the whole buffer. Hashing whole buffer is safer for exact match.
    // Requirement: "duplicate report... by name or by first 5 to 10 records"
    const crypto = require('crypto');
    const fingerprint = crypto
      .createHash('sha256')
      .update(file.buffer.slice(0, 5000)); // Hash first 5KB or similar? Or parse rows first?
    // Let's parse rows to be consistent with "records" check.
    // Actually, hashing the raw buffer is fastest and most accurate for "Same File".
    // But if they renamed 1 column, buffer hash changes.
    // Let's stick to "Duplicate Check" logic inside `processReportData` or separate?
    // For now, simple buffer hash or filename check is a good start.
    // User asked: "by name or by first 5 to 10 records".

    // Let's implement a robust check:
    // 1. Filename + Platform + Month Check (Existing Check)
    // 2. Content Fingerprint (First 10 lines of CSV)

    const fileContent = file.buffer.toString('utf-8'); // CAREFUL with large files.
    // Better: Read first 10 lines.
    const firstLines = fileContent.split('\n').slice(0, 10).join('\n').trim();
    const contentFingerprint = crypto
      .createHash('sha256')
      .update(firstLines)
      .digest('hex');

    // DUPLICATE CHECK
    const existingDupe = await this.prisma.revenueReport.findFirst({
      where: {
        OR: [
          {
            filename: file.originalname,
            platformId: platformId,
            month: month,
          },
          {
            fingerprint: contentFingerprint,
            platformId: platformId,
          },
        ],
      },
    });

    if (existingDupe) {
      // 409 Conflict for Duplicates
      throw new ConflictException(
        `Duplicate Report Detected! A report with similar content or name (${existingDupe.filename}) already exists for this platform.`,
      );
    }

    // 2. Process Data
    const { matchedData, params } = await this.processReportData(
      file,
      platformId,
      month,
      mapping,
    );

    // Persist Mapping if provided (using detected header row)
    if (mapping && Object.keys(mapping).length > 0) {
      await this.prisma.platform.update({
        where: { id: platformId },
        data: {
          mappingTemplate: {
            upsert: {
              create: {
                mappingRules: mapping,
                headerRowIndex: params.headerRowIndex,
              },
              update: {
                mappingRules: mapping,
                headerRowIndex: params.headerRowIndex,
              },
            },
          },
        },
      });
    }

    const platform = params.platform;

    // 4. Database Transaction
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const report = await tx.revenueReport.create({
            data: {
              filename: file.originalname,
              fingerprint: contentFingerprint,
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
        },
        { timeout: 20000 },
      );

      // 5. Trigger Sync (This is now the FINAL Step, so we auto-sync)
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

  // HUB METHODS
  // HUB METHODS
  async findAllReports(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        // { platform: { name: { contains: search, mode: 'insensitive' } } }, // Relation filter if needed
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.revenueReport.findMany({
        where: whereClause,
        include: {
          platform: true,
          _count: {
            select: { records: true },
          },
        },
        orderBy: { uploadDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.revenueReport.count({ where: whereClause }),
    ]);

    // Enhance data with Payout Count (Manual query to avoid complexity)
    const enhancedData = await Promise.all(
      data.map(async (report) => {
        const payoutCount = await this.prisma.payout.count({
          where: { items: { some: { reportId: report.id } } },
        });
        return { ...report, payoutCount };
      }),
    );

    return {
      data: enhancedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findReportById(id: string) {
    const report = await this.prisma.revenueReport.findUnique({
      where: { id },
      include: {
        platform: true,
        records: {
          include: {
            vendor: true,
          },
          orderBy: {
            grossRevenue: 'desc', // Optional: Sort by revenue
          },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    if (!report) throw new NotFoundException('Report not found');

    // Fetch Linked Payouts
    const payouts = await this.prisma.payout.findMany({
      where: { items: { some: { reportId: id } } },
      include: { vendor: true },
    });

    return { ...report, payouts };
  }

  async deleteReport(id: string, force = false, deletePayouts = false) {
    // 1. Check for Payouts
    const payoutsCount = await this.prisma.payout.count({
      where: { items: { some: { reportId: id } } },
    });

    if (payoutsCount > 0 && !force) {
      throw new ConflictException(
        `This report is linked to ${payoutsCount} payout(s). Please confirm deletion strategy.`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 2. Handle Payouts / Records
        if (payoutsCount > 0) {
          if (deletePayouts) {
            // Cascade Delete (DANGEROUS: Deletes the actual Payouts)
            // First delete Payouts linked to this report
            const linkedPayouts = await tx.payout.findMany({
              where: { items: { some: { reportId: id } } },
              select: { id: true, qbBillId: true },
            });
            const payoutIds = linkedPayouts.map((p) => p.id);

            // NEW: Sync Delete to QuickBooks
            for (const payout of linkedPayouts) {
              if (payout.qbBillId) {
                try {
                  await this.qbSyncService.deleteBill(payout.qbBillId);
                } catch (error: any) {
                  // strict sync: If QBO fails, we MUST abort local delete.
                  // Exception: If the bill is already gone (404), we consider it successful/idempotent.
                  const isNotFound =
                    error.status === 404 ||
                    (error.message &&
                      error.message.toLowerCase().includes('not found'));

                  if (isNotFound) {
                    // Already deleted in QBO, safe to proceed
                    console.warn(
                      `Bill ${payout.qbBillId} not found in QBO, proceeding with local delete.`,
                    );
                  } else {
                    // Any other error -> Abort Transaction
                    throw new InternalServerErrorException(
                      `Failed to delete QBO Bill ${payout.qbBillId}. Aborting to maintain sync. Error: ${error.message}`,
                    );
                  }
                }
              }
            }

            await tx.payout.deleteMany({
              where: { id: { in: payoutIds } },
            });
          } else {
            // UNLINK STRATEGY: Keep Payouts, but detach Records from Report
            // Set reportId = null for records that have a Payout
            await tx.revenueRecord.updateMany({
              where: { reportId: id, payoutId: { not: null } },
              data: { reportId: null },
            });
          }
        }

        // 3. Delete Remaining Records (Unpaid ones, or all if we deleted payouts)
        // Note: If we "Unlinked", the paid records now have reportId=null, so they won't be deleted here.
        // If we "Deleted Payouts", those records might still exist?
        // Wait, if we deleted Payouts, the records might still have payoutId=null now? No, the records are deleted if cascading.
        // But let's assume records stick around.
        // We want to delete ALL records associated with this report, UNLESS they were unlinked above.
        await tx.revenueRecord.deleteMany({ where: { reportId: id } });

        // 4. Delete Report
        await tx.revenueReport.delete({ where: { id } });

        return { message: 'Report deleted successfully' };
      },
      { timeout: 100000 },
    );
  }
}
