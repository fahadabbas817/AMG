import * as fs from 'fs';
import * as path from 'path';
import {
  parseSheet,
  scanForHeader,
} from './src/revenue/utils/universal-parser.util';

// Construct path relative to backend directory
// backend is at f:\Web Development\AMG\backend
// File is at f:\Web Development\AMG\Vendor Database_Payments & Tracking\CSV\Platform_Reports\...
const filePath = path.join(
  __dirname,
  '..',
  'Vendor Database_Payments & Tracking',
  'CSV',
  'Platform_Reports',
  'Dec. 2025_Studio Statistics - Payout by Title  AEBN Webmaster (1).csv',
);

console.log('Reading file from:', filePath);

try {
  const fileBuffer = fs.readFileSync(filePath);
  console.log('File read successfully. Size:', fileBuffer.length);

  // Parse as raw rows
  const rawRows = parseSheet(fileBuffer, { raw: true });
  console.log('Parsed raw rows. Total rows:', rawRows.length);

  // Debug output top rows
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    console.log(`Row ${i}:`, rawRows[i]);
  }

  console.log('Scanning for header...');
  const bestHeaderIndex = scanForHeader(rawRows);
  console.log('Best Header Index identified:', bestHeaderIndex);

  if (bestHeaderIndex !== -1) {
    console.log('Header Row Content:', rawRows[bestHeaderIndex]);
  } else {
    console.log('No header found.');
  }
} catch (error) {
  console.error('Error:', error);
}
