const XLSX = require('xlsx');
const fs = require('fs');

const filePath =
  'f:\\Web Development\\AMG\\Vendor Database_Payments & Tracking\\Sample Platform Reports by Platform\\aecash_item_report_December 2024.xlsx';

if (!fs.existsSync(filePath)) {
  console.error('File not found at:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total Rows:', data.length);

// Look for rows containing "AMG" or "Porn Mega Load"
console.log('\n--- Searching for target strings ---');
const targets = ['AMG', 'Porn', 'Mega', 'Load'];

let headerRow = -1;
// Function to dump row if matches
data.forEach((row, index) => {
  const str = JSON.stringify(row);
  // Rough heuristic to find header
  if (index < 5) {
    console.log(`[Header/Top Row ${index}]`, row);
  }

  // Check specific columns if possible, otherwise stringify
  if (str.toLowerCase().includes('amg')) {
    console.log(`[MATCH 'AMG' Row ${index}]`, row);
  }
});
