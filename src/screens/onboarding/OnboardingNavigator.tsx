import React, { useState } from 'react';
import { setSetting, createAccount, genId, getDb } from '@/db';
import { useOnboardingState } from './useOnboardingState';
import WelcomeScreen from './WelcomeScreen';
import CurrencyScreen from './CurrencyScreen';
import FirstAccountScreen from './FirstAccountScreen';
import AppLockScreen from './AppLockScreen';
import AllSetScreen from './AllSetScreen';

export default function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { data, update } = useOnboardingState();

  async function finish() {
    await getDb();
    await setSetting('currency', data.currency);
    await setSetting('currency_symbol', data.currencySymbol);
    await createAccount({
      name: data.accountName || 'Cash',
      type: data.accountType,
      icon: data.accountType === 'cash' ? 'ti-cash' : data.accountType === 'bank' ? 'ti-building-bank' : data.accountType === 'card' ? 'ti-credit-card' : 'ti-wallet',
      color: '#3D5AFE',
      starting_balance: parseFloat(data.startingBalance || '0') || 0,
      include_in_total: 1,
    });
    await setSetting('lock_enabled', data.biometricEnabled ? '1' : '0');
    await setSetting('biometric_enabled', data.biometricEnabled ? '1' : '0');
    await setSetting('onboarding_complete', '1');
    onComplete();
  }

  switch (step) {
    case 0:
      return <WelcomeScreen onNext={() => setStep(1)} />;
    case 1:
      return <CurrencyScreen data={data} update={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
    case 2:
      return <FirstAccountScreen data={data} update={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
    case 3:
      return (
        <AppLockScreen
          data={data}
          update={update}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
          onSkip={() => { update({ biometricEnabled: false }); setStep(4); }}
        />
      );
    case 4:
      return <AllSetScreen onFinish={finish} />;
    default:
      return <WelcomeScreen onNext={() => setStep(1)} />;
  }
}
