import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuickbooksSyncService } from '../quickbooks/quickbooks.sync.service';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => QuickbooksSyncService))
    private readonly quickbooksSyncService: QuickbooksSyncService,
  ) {}

  async getUnpaidSummaries(vendorId: string) {
    // 1. Validate Vendor
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // 2. Fetch All Unpaid Records (No Group By yet)
    // We need 'findMany' to get IDs
    const records = await this.prisma.revenueRecord.findMany({
      where: {
        vendorId: vendorId,
        payoutId: null,
      },
      select: {
        id: true,
        platformId: true,
        periodStart: true,
        grossRevenue: true,
      },
      orderBy: {
        periodStart: 'asc',
      },
    });

    if (records.length === 0) {
      return [];
    }

    // 3. Fetch Context (Platforms & Custom Splits)
    const platformIds = [...new Set(records.map((r) => r.platformId))];

    // Get Platforms (for Default Commission)
    const platforms = await this.prisma.platform.findMany({
      where: { id: { in: platformIds } },
    });
    const platformMap = new Map(platforms.map((p) => [p.id, p]));

    // Get Custom Splits (for Override Commission)
    const splits = await this.prisma.platformSplit.findMany({
      where: {
        vendorId: vendorId,
        platformId: { in: platformIds },
      },
    });
    const splitMap = new Map(
      splits.map((s) => [s.platformId, s.commissionRate]),
    );

    // 4. Group & Calculate In-Memory
    const grouped = new Map<
      string,
      {
        platformId: string;
        month: Date;
        recordIds: string[];
        grossRevenue: number;
      }
    >();

    for (const record of records) {
      // Key: platformId + month
      const key = `${record.platformId}-${record.periodStart.toISOString()}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          platformId: record.platformId,
          month: record.periodStart,
          recordIds: [],
          grossRevenue: 0,
        });
      }

      const group = grouped.get(key)!;
      group.recordIds.push(record.id);
      group.grossRevenue += Number(record.grossRevenue);
    }

    // 5. Transform to Summaries
    const summaries = Array.from(grouped.values()).map((group) => {
      const platform = platformMap.get(group.platformId);
      const customRate = splitMap.get(group.platformId);
      const rate =
        customRate !== undefined ? customRate : platform?.defaultSplit || 0;

      const grossAmount = group.grossRevenue;
      const commissionAmount = grossAmount * rate;
      const netPayout = grossAmount - commissionAmount;

      return {
        platformId: group.platformId,
        platformName: platform?.name || 'Unknown',
        month: group.month,
        grossAmount,
        commissionRate: rate,
        commissionAmount,
        netPayout,
        status: 'Unpaid',
        recordIds: group.recordIds, // Needed for Frontend selection
      };
    });

    return summaries;
  }

  async createPayout(dto: { vendorId: string; recordIds: string[] }) {
    const { vendorId, recordIds } = dto;

    // 1. Fetch Records (Read Phase - Non Blocking)
    const records = await this.prisma.revenueRecord.findMany({
      where: {
        id: { in: recordIds },
        vendorId: vendorId,
        payoutId: null,
      },
    });

    if (records.length !== recordIds.length) {
      throw new NotFoundException(
        'Some records were not found or belong to another vendor/payout.',
      );
    }

    // 2. Fetch Context (Read Phase)
    const platformIds = [...new Set(records.map((r) => r.platformId))];

    const platforms = await this.prisma.platform.findMany({
      where: { id: { in: platformIds } },
    });
    const platformMap = new Map(platforms.map((p) => [p.id, p]));

    const splits = await this.prisma.platformSplit.findMany({
      where: {
        vendorId: vendorId,
        platformId: { in: platformIds },
      },
    });
    const splitMap = new Map(
      splits.map((s) => [s.platformId, s.commissionRate]),
    );

    // 3. Calculate (CPU Phase)
    let totalPayoutAmount = 0;
    const updates = records.map((record) => {
      const platform = platformMap.get(record.platformId);
      const customRate = splitMap.get(record.platformId);
      const rate =
        customRate !== undefined ? customRate : platform?.defaultSplit || 0;

      const gross = Number(record.grossRevenue);
      const commission = gross * rate;
      const net = gross - commission;

      totalPayoutAmount += net;

      return {
        id: record.id,
        amgCommission: commission,
        vendorNet: net,
      };
    });

    // 4. Transaction (Write Phase)
    // We only lock for the write operations now.
    return await this.prisma.$transaction(
      async (tx) => {
        // Optimistic Verify: Ensure they are STILL unpaid
        const count = await tx.revenueRecord.count({
          where: {
            id: { in: recordIds },
            payoutId: null,
          },
        });

        if (count !== recordIds.length) {
          throw new Error('Records were modified by another transaction.');
        }

        // Create Payout
        // NEW: Aggregate sub-studios for summary
        const uniqueSubStudios = [
          ...new Set(records.map((r) => r.rawVendorName).filter(Boolean)),
        ];
        // Sort and join, limiting length if necessary
        const subLabelSummary = uniqueSubStudios
          .sort()
          .join(', ')
          .slice(0, 500); // 500 char safe limit

        const payout = await tx.payout.create({
          data: {
            vendorId: vendorId,
            totalAmount: totalPayoutAmount,
            status: 'PENDING',
            subLabelSummary: subLabelSummary, // Added field
          },
        });

        // 1. Bulk Link Records (Common Fields) - Fast
        await tx.revenueRecord.updateMany({
          where: { id: { in: recordIds } },
          data: {
            payoutId: payout.id,
            status: 'PENDING_PAYMENT',
          },
        });

        // 2. Individual Calculations (Optimized Bulk Update)
        // We use raw SQL with a VALUES list to update thousands of rows in a single query.
        // This avoids the overhead of thousands of individual update statements.
        // Postgres Parameter Limit is 65535, we use 3 params per row (id, comm, net).
        // 5000 * 3 = 15000 < 65535. Safe batch size: 2000.
        const BATCH_SIZE = 2000;

        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
          const chunk = updates.slice(i, i + BATCH_SIZE);

          // Construct the VALUES part of the query manually to avoid parameter count limits issues if any,
          // but mainly to construct the big query string efficiently.
          // Note: We should ideally use parameters for safety, but constructing a query
          // with thousands of $1, $2 is also heavy.
          // Since these values come from internal calculations and UUIDs, strict SQL injection risk is low,
          // BUT we will use Prisma's raw query tagging or simple string construction with minimal sanitization if needed.

          const valuesList: string[] = [];

          // Format based on SQL expectation: ('uuid', 12.34, 56.78)
          // We trust these numbers are safe (they are numbers). UUIDs are safe.
          chunk.forEach((u) => {
            valuesList.push(`('${u.id}', ${u.amgCommission}, ${u.vendorNet})`);
          });

          const valuesString = valuesList.join(', ');

          await tx.$executeRawUnsafe(`
            UPDATE "RevenueRecord" AS r
            SET "amgCommission" = v.commission::decimal, 
                "vendorNet" = v.net::decimal
            FROM (VALUES ${valuesString}) AS v(id, commission, net)
            WHERE r.id = v.id
          `);
        }

        return {
          message: 'Payout generated successfully',
          payoutId: payout.id,
          payoutNumber: payout.payoutNumber,
          totalAmount: totalPayoutAmount,
          recordsCount: records.length,
        };
      },
      {
        maxWait: 5000,
        timeout: 120000,
      },
    );
  }
  async findAll() {
    return this.prisma.payout.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            vendorNumber: true,
            qbVendorId: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPayout(id: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            bankDetails: true,
          },
        },
        items: {
          include: {
            platform: true,
          },
          orderBy: {
            grossRevenue: 'desc', // Sort items by amount
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  async settlePayout(id: string, paymentDate: Date) {
    const payout = await this.prisma.$transaction(
      async (tx) => {
        // 1. Update Payout
        const payout = await tx.payout.update({
          where: { id },
          data: {
            status: 'PAID',
            paymentDate: paymentDate,
          },
        });

        // 2. Update Linked Records
        await tx.revenueRecord.updateMany({
          where: { payoutId: id },
          data: {
            status: 'PAID',
          },
        });

        return payout;
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    // 3. Sync to QBO (Create Bill Payment)
    if (payout.qbBillId) {
      try {
        await this.quickbooksSyncService.createBillPayment(
          payout.id,
          payout.qbBillId,
          Number(payout.totalAmount),
          paymentDate,
        );
        this.logger.log(
          `[SettlePayout] Automatically created Bill Payment for Payout ${id}`,
        );
      } catch (e: any) {
        this.logger.error(
          `[SettlePayout] Failed to create QBO Bill Payment for Payout ${id}`,
          e.message,
        );
        // We do NOT rollback the local payment status, as Admin action should prevail.
        // Just log the error. Admin can manually retry or check logs.
      }
    }

    return payout;
  }

  async deletePayout(id: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status === 'PAID') {
      // Optional constraint: Do not allow deleting PAID payouts
      // throw new BadRequestException('Cannot delete a payout that is already marked as PAID.');
    }

    // 0. Delete from QuickBooks if synced
    if (payout.qbBillId) {
      try {
        await this.quickbooksSyncService.deleteBill(payout.qbBillId);
      } catch (e: any) {
        this.logger.error(
          `[deletePayout] Failed to delete QBO Bill ${payout.qbBillId}`,
          e,
        );
        // We throw here to prevent data inconsistency. User must resolve QBO issue or we need a force flag.
        // For now, straightforward strict consistency.
        throw new BadRequestException(
          `Failed to delete associated QuickBooks Bill. Please delete it in QuickBooks manually first or ensure connection is active. Error: ${e.message}`,
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Revert Revenue Records
      await tx.revenueRecord.updateMany({
        where: { payoutId: id },
        data: {
          payoutId: null,
          status: 'MATCHED', // Revert to MATCHED so they show up in "Unpaid" list again
        },
      });

      // 2. Delete Payout
      return await tx.payout.delete({
        where: { id },
      });
    });
  }

  async exportPayout(id: string, format: 'pdf' | 'xlsx') {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            platform: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // Helper to group items
    const groupedItems = new Map<string, any[]>();
    payout.items.forEach((item) => {
      // Use rawVendorName as the primary grouping key (Sub-studio)
      // Fallback to Platform name if rawVendorName is missing
      const subLabel = item.rawVendorName || item.platform.name || 'Unknown';

      const key = `${subLabel}`;
      if (!groupedItems.has(key)) {
        groupedItems.set(key, []);
      }
      groupedItems.get(key)!.push(item);
    });

    if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payout Report');

      // Header Section
      sheet.addRow(['Vendor:', payout.vendor.companyName]);
      sheet.addRow(['Payout #:', payout.payoutNumber]);
      sheet.addRow(['Date:', payout.createdAt.toISOString().split('T')[0]]);
      sheet.addRow([]);

      // --- Summary Section ---
      sheet.addRow(['Detailed Breakdown']);
      sheet.getRow(sheet.rowCount).font = { bold: true, size: 14 };
      sheet.addRow([]);

      let grandCheckTotal = 0;

      // --- Grouped Details Section ---
      groupedItems.forEach((items, groupKey) => {
        // Group Header
        sheet.addRow([groupKey]);
        const groupHeaderRow = sheet.getRow(sheet.rowCount);
        groupHeaderRow.font = {
          bold: true,
          size: 12,
          color: { argb: 'FFFFFFFF' },
        };
        groupHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F172A' }, // Slate-900 like color
        };

        // 1. Determine Dynamic Headers for this group (Metadata)
        const metadataKeys = Array.from(
          new Set(
            items.flatMap((item: any) =>
              item.metadata ? Object.keys(item.metadata) : [],
            ),
          ),
        ).sort();

        // 2. Add Header Row
        const headerRowValues = [
          'Title',
          'Platform', // Added Platform column
          ...metadataKeys,
          'Gross Revenue',
          'Commission',
          'Net',
        ];
        const headerRow = sheet.addRow(headerRowValues);
        headerRow.font = { bold: true };

        // 3. Add Data Rows
        items.forEach((item) => {
          const metaValues = metadataKeys.map((k) =>
            item.metadata && item.metadata[k] !== undefined
              ? item.metadata[k]
              : '-',
          );
          sheet.addRow([
            item.lineItemName || 'N/A',
            item.platform.name, // Added Platform value
            ...metaValues,
            Number(item.grossRevenue),
            Number(item.amgCommission),
            Number(item.vendorNet),
          ]);
        });

        // 4. Add Subtotal
        const subExp = items.reduce(
          (acc, i) => acc + Number(i.grossRevenue),
          0,
        );
        const subNet = items.reduce((acc, i) => acc + Number(i.vendorNet), 0);
        grandCheckTotal += subNet;

        // Subtotal Row
        // Align with financial columns.
        // Title(1) + Platform(1) + Meta(N) -> Total N+2 cols before Gross
        const subRow = [
          `Total for ${groupKey}`,
          '', // Platform placeholder
          ...new Array(metadataKeys.length).fill(''),
          subExp,
          '-',
          subNet,
        ];

        const row = sheet.addRow(subRow);
        row.font = { bold: true };
        row.getCell(headerRowValues.length).numFmt = '$#,##0.00'; // Format Net
        row.getCell(headerRowValues.length - 2).numFmt = '$#,##0.00'; // Format Gross

        sheet.addRow([]); // Spacer
      });

      // Grand Total
      sheet.addRow([]);
      const grandTotalRow = sheet.addRow([
        'Configuration Check Total',
        '',
        '',
        '',
        '',
        grandCheckTotal,
      ]);
      grandTotalRow.font = { bold: true, size: 12 };
      grandTotalRow.getCell(6).numFmt = '$#,##0.00';

      return await workbook.xlsx.writeBuffer();
    } else {
      // --- PDF EXPORT ---
      const PdfPrinter = require('pdfmake');
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
      };
      const printer = new PdfPrinter(fonts);

      // PDF Content
      const docContent: any[] = [
        { text: `Payout Report #${payout.payoutNumber}`, style: 'header' },
        { text: `Vendor: ${payout.vendor.companyName}`, style: 'subheader' },
        {
          text: `Date: ${payout.createdAt.toISOString().split('T')[0]}`,
          margin: [0, 0, 0, 20],
        },
      ];

      // --- Grouped Details Section for PDF ---
      groupedItems.forEach((items, groupKey) => {
        // Determine dynamic keys
        const metadataKeys = Array.from(
          new Set(
            items.flatMap((item: any) =>
              item.metadata ? Object.keys(item.metadata) : [],
            ),
          ),
        ).sort();

        // Calculate dynamic widths:
        // Title: '*', Platform: 'auto', then Auto for meta, then Auto for financial
        // Total columns: 1 (Title) + 1 (Platform) + N (Meta) + 3 (Gross, Comm, Net)
        const widths = [
          '*',
          'auto', // Platform width
          ...metadataKeys.map(() => 'auto'),
          'auto',
          'auto',
          'auto',
        ];

        const tableBody = [
          // Header
          [
            { text: 'Title', style: 'tableHeader' },
            { text: 'Platform', style: 'tableHeader' },
            ...metadataKeys.map((k) => ({ text: k, style: 'tableHeader' })),
            { text: 'Gross', style: 'tableHeader' },
            { text: 'Comm', style: 'tableHeader' },
            { text: 'Net', style: 'tableHeader' },
          ],
          // Rows
          ...items.map((item: any) => [
            item.lineItemName || 'N/A',
            { text: item.platform.name, style: 'small' },
            ...metadataKeys.map((k) =>
              item.metadata && item.metadata[k] !== undefined
                ? String(item.metadata[k])
                : '-',
            ),
            `$${Number(item.grossRevenue).toFixed(2)}`,
            `$${Number(item.amgCommission).toFixed(2)}`,
            `$${Number(item.vendorNet).toFixed(2)}`,
          ]),
          // Subtotal
          [
            {
              text: `Total for ${groupKey}`,
              colSpan: 2 + metadataKeys.length,
              bold: true,
              alignment: 'right',
            },
            {}, // Platform placehold
            ...new Array(metadataKeys.length).fill({}),
            {
              text: `$${items.reduce((acc, i) => acc + Number(i.grossRevenue), 0).toFixed(2)}`,
              bold: true,
            },
            '-',
            {
              text: `$${items.reduce((acc, i) => acc + Number(i.vendorNet), 0).toFixed(2)}`,
              bold: true,
            },
          ],
        ];

        docContent.push(
          {
            text: groupKey,
            style: 'subheader',
            margin: [0, 10, 0, 5],
            color: '#0f172a',
          },
          {
            table: {
              headerRows: 1,
              widths: widths,
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
          { text: ' ', margin: [0, 5] }, // Spacer
        );
      });

      const docDefinition = {
        content: docContent,
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          tableHeader: { bold: true, fontSize: 10, fillColor: '#eeeeee' },
          small: { fontSize: 8, color: '#64748b' },
        },
        defaultStyle: { fontSize: 10, columnGap: 10 },
      };

      return new Promise((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.end();
      });
    }
  }
}
