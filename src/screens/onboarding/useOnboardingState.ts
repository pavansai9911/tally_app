import { useState } from 'react';

export interface OnboardingData {
  currency: string;
  currencySymbol: string;
  accountName: string;
  accountType: 'cash' | 'bank' | 'card' | 'wallet';
  startingBalance: string;
  biometricEnabled: boolean;
}

export function useOnboardingState() {
  const [data, setData] = useState<OnboardingData>({
    currency: 'INR',
    currencySymbol: '₹',
    accountName: 'Cash',
    accountType: 'cash',
    startingBalance: '0',
    biometricEnabled: true,
  });

  const update = (patch: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...patch }));

  return { data, update };
}
