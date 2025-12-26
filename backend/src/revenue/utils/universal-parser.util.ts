import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';

// Keywords to identify potential header rows
const HEADER_KEYWORDS = [
  'studio',
  'revenue',
  'earnings',
  'title',
  'date',
  'period',
  'gross',
  'net',
  'commission',
  'vendor',
  'video',
  'sales',
  'amount',
  'currency',
  'payouts',
];

export interface ParseOptions {
  headerRow?: number;
  raw?: boolean; // If true, returns array of arrays
}

/**
 * Calculates a "header score" for a row based on keyword matches.
 */
const calculateRowScore = (row: any[]): number => {
  if (!Array.isArray(row)) return 0;
  let score = 0;
  const rowString = row.join(' ').toLowerCase();

  HEADER_KEYWORDS.forEach((keyword) => {
    if (rowString.includes(keyword)) {
      score++;
    }
  });
  return score;
};

/**
 * Extracts metadata from rows above the main header.
 * Looks for header-like rows and captures the values immediately below them.
 */
const extractMetadataFromRows = (rows: any[][]): Record<string, any> => {
  const metadata: Record<string, any> = {};

  for (let i = 0; i < rows.length - 1; i++) {
    const row = rows[i];
    const score = calculateRowScore(row);

    // If it looks like a header (score >= 2), assume next row is values
    if (score >= 2) {
      const keys = row;
      const values = rows[i + 1];

      if (Array.isArray(keys) && Array.isArray(values)) {
        keys.forEach((key, index) => {
          const val = values[index];
          if (
            typeof key === 'string' &&
            key.trim() &&
            val !== undefined &&
            val !== ''
          ) {
            metadata[key.trim()] = val;
          }
        });
      }
      i++; // Skip the value row to avoid re-scanning it
    }
  }
  return metadata;
};

export const parseSheet = (buffer: Buffer, options?: ParseOptions): any[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    if (!workbook.SheetNames.length) {
      throw new BadRequestException('Invalid file: No sheets found.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // If raw mode, return array of arrays
    if (options?.raw) {
      return XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
      });
    }

    // Determine header row
    let headerRow = options?.headerRow;

    // If explicit headerRow is provided and > 0, try to extract metadata from above
    let mergedMetadata: Record<string, any> = {};

    if (headerRow && headerRow > 0) {
      // Create a lightweight range for the rows ABOVE the header
      const metaRange = {
        s: { c: 0, r: 0 },
        e: { c: 100, r: headerRow - 1 }, // Scan up to 100 columns?
      };
      // actually sheet_to_json with header:1 automatically figures out columns
      // We just need to limit rows.
      // But XLSX doesn't easily let us say "read rows 0 to N".
      // We can use the logic of decoding range, or just read the whole thing as header:1 and slice.
      // To be safe and reuse existing sheet logic:

      const fullSheetRaw = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
      }) as any[][];
      const upperRows = fullSheetRaw.slice(0, headerRow);

      mergedMetadata = extractMetadataFromRows(upperRows);
    }

    // Now parse the main data
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    if (headerRow !== undefined) {
      range.s.r = headerRow;
      worksheet['!ref'] = XLSX.utils.encode_range(range);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!jsonData || jsonData.length === 0) {
      throw new BadRequestException('Invalid or empty file: No rows found.');
    }

    // Merge metadata if present
    if (Object.keys(mergedMetadata).length > 0) {
      return jsonData.map((row: any) => ({
        ...mergedMetadata,
        ...row,
      }));
    }

    return jsonData;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    console.error('Parsing error:', error);
    throw new BadRequestException(
      'Failed to parse file. Please ensure it is a valid CSV or Excel file.',
    );
  }
};

/**
 * Scans the first 40 rows to find the most likely header row.
 * Returns the index of the header row, or -1 if no good candidate found.
 */
export const scanForHeader = (rows: any[][]): number => {
  let bestRowIndex = -1;
  let maxScore = 0;

  // Scan top 40 rows or total rows
  const limit = Math.min(rows.length, 40);

  for (let i = 0; i < limit; i++) {
    const score = calculateRowScore(rows[i]);

    // Heuristic: A header row should have at least 2 matching keywords
    // We use >= maxScore to prefer the *last* valid header (closest to data)
    // This allows "Metadata Headers" to be skipped in favor of the "Data Table" header
    if (score >= 2 && score >= maxScore) {
      maxScore = score;
      bestRowIndex = i;
    }
  }

  return bestRowIndex;
};
