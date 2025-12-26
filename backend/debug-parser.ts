import {
  scanForHeader,
  parseSheet,
} from './src/revenue/utils/universal-parser.util';

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

console.log('Starting Debug...');
const headerIndex = scanForHeader(mockData);
console.log('Result Header Index:', headerIndex);

if (headerIndex === 3) {
  console.log('SUCCESS: Selected correct header.');
} else {
  console.log('FAILURE: Selected wrong header.');
}
