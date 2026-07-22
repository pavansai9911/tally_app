// Supported currencies.
//
// To add a new currency later, just append an entry here — the onboarding picker,
// the Settings picker and all amount formatting read from this single list.
// `grouping` selects the digit-grouping style: 'indian' -> 12,34,567  'western' -> 1,234,567

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  grouping: 'indian' | 'western';
}

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', grouping: 'indian' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', grouping: 'western' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', grouping: 'western' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', grouping: 'western' },
];

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0];

// Module-level "active currency" so the synchronous formatCurrency() used across every
// screen doesn't need async lookups. Loaded once at app startup and updated when changed.
let active: Currency = DEFAULT_CURRENCY;

export function getActiveCurrency(): Currency {
  return active;
}

export function setActiveCurrency(code: string | null | undefined): void {
  const found = CURRENCIES.find((c) => c.code === code);
  if (found) active = found;
}

export function findCurrency(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
