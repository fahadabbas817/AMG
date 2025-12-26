import { scanForHeader, parseSheet } from './universal-parser.util';
import * as XLSX from 'xlsx';

describe('UniversalParserUtil', () => {
  // Mock Data mimicking SEXLIKEREAL structure
  const mockData = [
    ['SEXLIKEREAL', '', '', '', '', '', '', ''],
    [
      'Pay Period',
      '',
      '',
      'Amount, $',
      'Status',
      'Last Updated',
      'Invoice Number',
      'Payment Method',
    ],
    [
      'July, 2025',
      '',
      '',
      '1,963.99',
      'Invoice issued',
      '11-Aug-25',
      '4780',
      'Bank Transfer',
    ],
    ['Studio', 'Payouts, $', 'Vendor ID', '', '', '', '', ''],
    ['Rome Major', '2.77', '', '', '', '', '', ''],
    ['JapornXXX', '1,155.41', '', '', '', '', '', ''],
  ];

  it('should identify the correct header row (Studio/Payouts)', () => {
    const headerIndex = scanForHeader(mockData);
    // We expect index 3 (Row 4: Studio...)
    // Row 1 (Pay Period) score: 2 ("Period", "Amount")
    // Row 3 (Studio) score: 2 ("Studio", "Vendor" - if "Vendor ID" counts)
    // Since 2 >= 2, the LAST one (Row 3) should win.
    expect(headerIndex).toBe(3);
  });

  it('should extract metadata from rows above the header and merge it', () => {
    // Create a mock buffer
    const ws = XLSX.utils.aoa_to_sheet(mockData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });

    // Parse with headerRow = 3 (as identified by scanForHeader)
    const parsed = parseSheet(buffer, { headerRow: 3 });

    // Check Row 1 (Rome Major)
    const row1 = parsed[0];
    expect(row1['Studio']).toBe('Rome Major');
    expect(row1['Payouts, $']).toBe('2.77'); // Actually string in CSV usually

    // Metadata fields should be merged
    expect(row1['Pay Period']).toBe('July, 2025');
    expect(row1['Amount, $']).toBe('1,963.99');
  });
});
