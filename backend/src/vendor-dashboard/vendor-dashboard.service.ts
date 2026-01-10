import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutService } from '../payout/payout.service';

@Injectable()
export class VendorDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  async getDashboardSummary(vendorId: string) {
    if (!vendorId) {
      throw new BadRequestException('Vendor ID is required');
    }
    // 1. Total Earned: Sum of vendorNet from all RevenueRecords for this vendor
    const totalEarnedAggregate = await this.prisma.revenueRecord.aggregate({
      where: {
        vendorId: vendorId,
      },
      _sum: {
        vendorNet: true,
      },
    });
    const totalEarned = totalEarnedAggregate._sum.vendorNet || 0;

    // 2. Total Paid: Sum of vendorNet where linked Payout is PAID
    const totalPaidAggregate = await this.prisma.revenueRecord.aggregate({
      where: {
        vendorId: vendorId,
        payout: {
          status: 'PAID',
        },
      },
      _sum: {
        vendorNet: true,
      },
    });
    const totalPaid = totalPaidAggregate._sum.vendorNet || 0;

    // 3. Total Pending: Sum of vendorNet where linked Payout exists AND status != PAID
    // "bills are generate when they mapped their status is PENDING_PAYMENT"
    const totalPendingAggregate = await this.prisma.revenueRecord.aggregate({
      where: {
        vendorId: vendorId,
        payoutId: { not: null },
        payout: { status: { not: 'PAID' } },
      },
      _sum: {
        vendorNet: true,
      },
    });
    const totalPending = totalPendingAggregate._sum.vendorNet || 0;

    return {
      totalEarned: Number(totalEarned),
      totalPaid: Number(totalPaid),
      totalPending: Number(totalPending),
    };
  }

  async getStats(
    vendorId: string,
    filters: { platformId?: string; startDate?: string; endDate?: string },
  ) {
    if (!vendorId) {
      throw new BadRequestException('Vendor ID is required');
    }

    const { platformId, startDate, endDate } = filters;

    const where: any = {
      vendorId: vendorId,
    };

    if (platformId && platformId !== 'all') {
      where.platformId = platformId;
    }

    if (startDate) {
      where.periodStart = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.periodEnd = {
        lte: new Date(endDate),
      };
    }

    const records = await this.prisma.revenueRecord.findMany({
      where,
      include: {
        platform: {
          select: { name: true },
        },
        payout: {
          select: { status: true },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    return records.map((record) => {
      let status = 'UNPROCESSED';
      if (record.payout) {
        if (record.payout.status === 'PAID') {
          status = 'PAID';
        } else {
          status = 'PENDING_PAYMENT';
        }
      }

      return {
        id: record.id,
        title: record.lineItemName || 'Untitled',
        studio:
          (record.metadata as any)?.['Studio'] ||
          (record.metadata as any)?.['studio'] ||
          '-',
        total: Number(record.vendorNet),
        platform: record.platform.name,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        status,
        metadata: record.metadata,
      };
    });
  }

  async getVendorPlatforms(vendorId: string) {
    // Get platforms where the vendor has a split (contracted)
    const splits = await this.prisma.platformSplit.findMany({
      where: { vendorId },
      include: {
        platform: true,
      },
    });

    return splits.map((split) => split.platform);
  }

  // --- Payouts ---

  async getPayouts(vendorId: string) {
    return this.prisma.payout.findMany({
      where: { vendorId },
      select: {
        id: true,
        payoutNumber: true,
        totalAmount: true,
        paymentDate: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPayout(vendorId: string, payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        vendor: {
          select: { companyName: true },
        },
        items: {
          include: {
            platform: {
              select: { name: true },
            },
          },
          orderBy: {
            grossRevenue: 'desc',
          },
        },
      },
    });

    if (!payout || payout.vendorId !== vendorId) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  async exportPayout(
    vendorId: string,
    payoutId: string,
    format: 'pdf' | 'xlsx',
  ) {
    // Verify ownership
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      select: { vendorId: true },
    });

    if (!payout || payout.vendorId !== vendorId) {
      throw new NotFoundException('Payout not found');
    }

    // Delegate to PayoutService
    return this.payoutService.exportPayout(payoutId, format);
  }

  async exportStats(
    vendorId: string,
    filters: { platformId?: string; startDate?: string; endDate?: string },
    format: 'pdf' | 'xlsx',
  ) {
    if (!vendorId) {
      throw new BadRequestException('Vendor ID is required');
    }

    const { platformId, startDate, endDate } = filters;

    const where: any = {
      vendorId: vendorId,
    };

    if (platformId && platformId !== 'all') {
      where.platformId = platformId;
    }

    if (startDate) {
      where.periodStart = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.periodEnd = {
        lte: new Date(endDate),
      };
    }

    const records = await this.prisma.revenueRecord.findMany({
      where,
      include: {
        platform: {
          select: { name: true },
        },
        vendor: {
          select: { companyName: true },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    if (records.length === 0) {
      throw new NotFoundException('No records found for the selected criteria');
    }

    // Reuse grouping logic from exportPayout
    const groupedItems = new Map<string, any[]>();
    records.forEach((item) => {
      const key = `${item.platform.name}: ${item.periodStart.toISOString().slice(0, 7)}`; // "Platform: YYYY-MM"
      if (!groupedItems.has(key)) {
        groupedItems.set(key, []);
      }
      groupedItems.get(key)!.push(item);
    });

    if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stats Report');

      const vendorName = records[0]?.vendor?.companyName || 'Unknown Vendor';
      const dateRange = `${startDate ? startDate.split('T')[0] : 'Start'} to ${endDate ? endDate.split('T')[0] : 'End'}`;

      sheet.addRow(['Vendor:', vendorName]);
      sheet.addRow(['Report:', 'Detailed Stats']);
      sheet.addRow(['Period:', dateRange]);
      sheet.addRow([]);

      // --- Grouped Details Section ---
      groupedItems.forEach((items, groupKey) => {
        sheet.addRow([]);
        sheet.addRow([groupKey]);
        sheet.getRow(sheet.rowCount).font = { bold: true, size: 12 };

        // 1. Determine Dynamic Headers
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
            item.metadata && (item.metadata as any)[k] !== undefined
              ? (item.metadata as any)[k]
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

      const vendorName = records[0]?.vendor?.companyName || 'Unknown Vendor';
      const dateRange = `${startDate ? startDate.split('T')[0] : 'Start'} to ${endDate ? endDate.split('T')[0] : 'End'}`;

      const docContent: any[] = [
        { text: `Detailed Stats Report`, style: 'header' },
        { text: `Vendor: ${vendorName}`, style: 'subheader' },
        { text: `Period: ${dateRange}`, margin: [0, 0, 0, 20] },
      ];

      // --- Grouped Details Section for PDF ---
      groupedItems.forEach((items, groupKey) => {
        const metadataKeys = Array.from(
          new Set(
            items.flatMap((item: any) =>
              item.metadata ? Object.keys(item.metadata) : [],
            ),
          ),
        ).sort();

        const widths = [
          '*',
          ...metadataKeys.map(() => 'auto'),
          'auto',
          'auto',
          'auto',
        ];

        const tableBody = [
          [
            { text: 'Title', style: 'tableHeader' },
            ...metadataKeys.map((k) => ({ text: k, style: 'tableHeader' })),
            { text: 'Gross', style: 'tableHeader' },
            { text: 'Comm', style: 'tableHeader' },
            { text: 'Net', style: 'tableHeader' },
          ],
          ...items.map((item: any) => [
            item.lineItemName || 'N/A',
            ...metadataKeys.map((k) =>
              item.metadata && (item.metadata as any)[k] !== undefined
                ? String((item.metadata as any)[k])
                : '-',
            ),
            `$${Number(item.grossRevenue).toFixed(2)}`,
            `$${Number(item.amgCommission).toFixed(2)}`,
            `$${Number(item.vendorNet).toFixed(2)}`,
          ]),
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
        defaultStyle: { fontSize: 8, columnGap: 5 }, // Smaller font for stats
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
