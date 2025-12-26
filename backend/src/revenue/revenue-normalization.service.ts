import { BadRequestException, Injectable } from '@nestjs/common';
import { PLATFORM_STRATEGIES } from './config/platform-strategies.config';

@Injectable()
export class RevenueNormalizationService {
  normalize(rows: any[], platformName: string) {
    const strategy = PLATFORM_STRATEGIES[platformName];

    if (!strategy) {
      throw new BadRequestException(
        `No strategy found for platform: ${platformName}. Please configure the matching logic first.`,
      );
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    // validate headers from the first row
    const firstRow = rows[0];
    const missingCols = strategy.requiredCols.filter(
      (col) => !Object.prototype.hasOwnProperty.call(firstRow, col),
    );

    // Validate amount column (needs special handling for aliases)
    let validAmountCol = '';
    if (Array.isArray(strategy.amountCol)) {
      const foundCol = strategy.amountCol.find((col) =>
        Object.prototype.hasOwnProperty.call(firstRow, col),
      );
      if (!foundCol) {
        missingCols.push(`One of: ${strategy.amountCol.join(', ')}`);
      } else {
        validAmountCol = foundCol;
      }
    } else {
      if (!Object.prototype.hasOwnProperty.call(firstRow, strategy.amountCol)) {
        missingCols.push(strategy.amountCol);
      } else {
        validAmountCol = strategy.amountCol;
      }
    }

    if (missingCols.length > 0) {
      throw new BadRequestException(
        `Missing required columns for ${platformName}: ${missingCols.join(', ')}`,
      );
    }

    return rows
      .filter((row) => {
        // Filter out garbage rows (must have vendor or amount)
        const hasVendor = row[strategy.vendorCol];
        const hasAmount = row[validAmountCol];
        return hasVendor && hasAmount;
      })
      .map((row) => {
        // greedy metadata extraction: everything NOT a core column is metadata
        const metadata = {};
        const coreCols = [
          strategy.vendorCol,
          validAmountCol, // Use the resolved column
          strategy.titleCol,
        ];

        Object.keys(row).forEach((key) => {
          if (!coreCols.includes(key)) {
            metadata[key] = row[key];
          }
        });

        return {
          rawVendorName: row[strategy.vendorCol],
          grossRevenue: this.parseAmount(row[validAmountCol]),
          lineItemName: strategy.titleCol ? row[strategy.titleCol] : 'N/A',
          metadata,
          // Keeping original row data is often useful for audits
          rawLineData: row,
        };
      });
  }

  private parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and handle Euro symbol specifically if needed
      const cleaned = value.replace(/[€$,\s]/g, '').trim();
      const float = parseFloat(cleaned);
      return isNaN(float) ? 0 : float;
    }
    return 0;
  }
}
