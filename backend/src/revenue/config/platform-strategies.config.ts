export interface PlatformStrategy {
  vendorCol: string;
  amountCol: string | string[]; // support aliases
  titleCol?: string;
  requiredCols: string[];
  headerRow?: number;
}

export const PLATFORM_STRATEGIES: Record<string, PlatformStrategy> = {
  AEBN: {
    vendorCol: 'Studio',
    amountCol: 'Total',
    titleCol: 'Title',
    requiredCols: ['Studio', 'Total', 'Title'],
  },
  AVE: {
    vendorCol: 'Studio',
    amountCol: 'Total', // From Detail file analysis (was 'Total Sales' in summary)
    titleCol: 'Title',
    headerRow: 18, // Detail file header starts at line 19
    requiredCols: ['Studio', 'Total', 'Title'],
  },
  SEXLIKEREAL: {
    vendorCol: 'Studio',
    amountCol: 'Payouts, $',
    headerRow: 3, // header is on row 4 (index 3)
    requiredCols: ['Studio', 'Payouts, $'],
  },
  Velvet: {
    vendorCol: 'Label',
    amountCol: ['Total Sale net vat', 'Netsales (CC)'],
    titleCol: 'Title',
    requiredCols: ['Label', 'Title'], // Removed specific amount col from required since it varies
  },
  AECASH: {
    vendorCol: 'Studio',
    amountCol: 'Total',
    titleCol: 'Title',
    requiredCols: ['Studio', 'Total', 'Title'],
  },
};
