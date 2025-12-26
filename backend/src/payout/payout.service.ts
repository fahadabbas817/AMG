import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

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
        const payout = await tx.payout.create({
          data: {
            vendorId: vendorId,
            totalAmount: totalPayoutAmount,
            status: 'PENDING',
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
    return await this.prisma.$transaction(
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
      const key = `${item.platform.name}: ${item.periodStart.toISOString().slice(0, 7)}`; // "Platform: YYYY-MM"
      if (!groupedItems.has(key)) {
        groupedItems.set(key, []);
      }
      groupedItems.get(key)!.push(item);
    });

    if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payout Report');

      sheet.addRow(['Vendor:', payout.vendor.companyName]);
      sheet.addRow(['Payout #:', payout.payoutNumber]);
      sheet.addRow(['Date:', payout.createdAt.toISOString().split('T')[0]]);
      sheet.addRow([]);

      // --- Summary Section ---
      sheet.addRow(['Platform', 'Month', 'Gross', 'Net Payout']);
      sheet.getRow(5).font = { bold: true };

      const summary = new Map();
      payout.items.forEach((item) => {
        const key = `${item.platform.name}-${item.periodStart}`;
        if (!summary.has(key)) {
          summary.set(key, {
            platform: item.platform.name,
            month: item.periodStart,
            gross: 0,
            net: 0,
          });
        }
        const s = summary.get(key);
        s.gross += Number(item.grossRevenue);
        s.net += Number(item.vendorNet);
      });

      summary.forEach((val) => {
        sheet.addRow([
          val.platform,
          val.month.toISOString().split('T')[0],
          val.gross,
          val.net,
        ]);
      });

      sheet.addRow([]);
      sheet.addRow(['Detail View']);
      sheet.getRow(sheet.rowCount).font = { bold: true, size: 14 };

      // --- Grouped Details Section ---
      groupedItems.forEach((items, groupKey) => {
        sheet.addRow([]); // ID: 890123
        sheet.addRow([groupKey]); // Group Header
        sheet.getRow(sheet.rowCount).font = { bold: true, size: 12 };

        // 1. Determine Dynamic Headers for this group
        const metadataKeys = Array.from(
          new Set(
            items.flatMap((item: any) =>
              item.metadata ? Object.keys(item.metadata) : [],
            ),
          ),
        ).sort();

        // 2. Add Header Row
        const headerRow = [
          'Title',
          ...metadataKeys,
          'Gross Revenue',
          'Commission',
          'Net',
        ];
        sheet.addRow(headerRow);
        sheet.getRow(sheet.rowCount).font = { bold: true };

        // 3. Add Data Rows
        items.forEach((item) => {
          const metaValues = metadataKeys.map((k) =>
            item.metadata && item.metadata[k] !== undefined
              ? item.metadata[k]
              : '-',
          );
          sheet.addRow([
            item.lineItemName || 'N/A',
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

        // Calculate empty cells to align Gross/Net correctly.
        // Headers: [Title (1)] + [Meta (N)] + [Gross (1)] + [Comm (1)] + [Net (1)]
        // Subtotal row needs to align with Gross (index 1+N+1)
        const emptyCols = new Array(1 + metadataKeys.length).fill('');
        // Actually, we can just push empty strings.
        const subRow = [
          'Subtotal',
          ...new Array(metadataKeys.length).fill(''),
          subExp,
          '-',
          subNet,
        ];

        const row = sheet.addRow(subRow);
        row.font = { bold: true };
      });

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

      const summary = new Map();
      payout.items.forEach((item) => {
        const key = `${item.platform.name}-${item.periodStart}`;
        if (!summary.has(key)) {
          summary.set(key, {
            platform: item.platform.name,
            month: item.periodStart,
            gross: 0,
            net: 0,
          });
        }
        const s = summary.get(key);
        s.gross += Number(item.grossRevenue);
        s.net += Number(item.vendorNet);
      });

      const docContent: any[] = [
        { text: `Payout Report #${payout.payoutNumber}`, style: 'header' },
        { text: `Vendor: ${payout.vendor.companyName}`, style: 'subheader' },
        {
          text: `Date: ${payout.createdAt.toISOString().split('T')[0]}`,
          margin: [0, 0, 0, 20],
        },
        { text: 'Summary', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
              ['Platform', 'Month', 'Gross', 'Net'],
              ...Array.from(summary.values()).map((s: any) => [
                s.platform,
                s.month.toISOString().split('T')[0],
                `$${s.gross.toFixed(2)}`,
                `$${s.net.toFixed(2)}`,
              ]),
            ],
          },
        },
        { text: ' ', margin: [0, 20] },
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
        // Title: '*', then Auto for meta, then Auto for financial
        // Total columns: 1 (Title) + N (Meta) + 3 (Gross, Comm, Net)
        const widths = [
          '*',
          ...metadataKeys.map(() => 'auto'),
          'auto',
          'auto',
          'auto',
        ];

        const tableBody = [
          // Header
          [
            { text: 'Title', style: 'tableHeader' },
            ...metadataKeys.map((k) => ({ text: k, style: 'tableHeader' })),
            { text: 'Gross', style: 'tableHeader' },
            { text: 'Comm', style: 'tableHeader' },
            { text: 'Net', style: 'tableHeader' },
          ],
          // Rows
          ...items.map((item: any) => [
            item.lineItemName || 'N/A',
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
            { text: 'Subtotal', colSpan: 1 + metadataKeys.length, bold: true },
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
          { text: groupKey, style: 'subheader', margin: [0, 10, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: widths,
              body: tableBody,
            },
          },
        );
      });

      const docDefinition = {
        content: docContent,
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          tableHeader: { bold: true, fontSize: 10, fillColor: '#eeeeee' },
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
