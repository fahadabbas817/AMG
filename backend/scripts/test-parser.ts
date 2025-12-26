import { scanForHeader } from '../src/revenue/utils/universal-parser.util';

const mockRows = [
  ['Row 1', 'Trash'],
  ['Row 2', 'Trash'],
  ['Studio', 'Title', 'Gross Revenue', 'Notes'], // Header
  ['Blue', 'Movie 1', '100', ''],
  ['Red', 'Movie 2', '200', ''],
];

console.log('Testing scanForHeader...');
const index = scanForHeader(mockRows);
console.log(`Expected: 2, Got: ${index}`);

if (index === 2) {
  console.log('PASS');
} else {
  console.log('FAIL');
  process.exit(1);
}
