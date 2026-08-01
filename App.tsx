import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { getDb, hasCompletedOnboarding, getSetting } from '@/db';
import { RootNavigator } from '@/navigation/RootNavigator';
import OnboardingNavigator from '@/screens/onboarding/OnboardingNavigator';
import LockScreen from '@/screens/lock/LockScreen';
import RestoreGateScreen from '@/screens/onboarding/RestoreGateScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { TourProvider } from '@/tour/TourProvider';
import { runStartupTasks } from '@/services/startup';
import { initAutoBackup, backupNow } from '@/services/autoBackup';
import { isPinSet, isBiometricAvailable } from '@/services/lock';
import { setActiveCurrency } from '@/utils/currency';

// 'restore' runs only on a first launch (not yet onboarded): it checks the on-device
// Tally-tracker backup and auto-restores if one exists, otherwise falls through to onboarding.
type AppPhase = 'loading' | 'restore' | 'onboarding' | 'locked' | 'unlocked';

function AppInner() {
  const { colors, isDark } = useTheme();
  // Top safe-area inset. On Android 15+/target SDK 36 the OS forces edge-to-edge and ignores
  // the status-bar reservation, so content would draw under the status bar / camera cutout.
  // This inset is 0 on older Android (window already sits below the bar), so padding by it is
  // self-correcting and keeps every screen clear of the status bar on ALL devices.
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<AppPhase>('loading');

  // Post-setup entry: apply currency, arm auto-backup, run launch tasks, then reveal the app
  // (locked only if a real credential exists). Shared by a normal launch and a completed restore.
  const enterApp = useCallback(async () => {
    setActiveCurrency(await getSetting('currency'));
    await initAutoBackup();
    await runStartupTasks();
    const lockEnabled = (await getSetting('lock_enabled')) === '1';
    const biometricEnabled = (await getSetting('biometric_enabled')) === '1';
    const canLock = lockEnabled && ((await isPinSet()) || (biometricEnabled && (await isBiometricAvailable())));
    setPhase(canLock ? 'locked' : 'unlocked');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await getDb(); // runs migrations + seeds defaults
        // Apply any saved currency before anything renders amounts (no-op default if unset).
        setActiveCurrency(await getSetting('currency'));
        const onboarded = await hasCompletedOnboarding();
        if (!onboarded) {
          // First launch on this DB — could be a reinstall. The restore gate decides.
          setPhase('restore');
          return;
        }
        await enterApp();
      } catch {
        // Fail safe: send the user to onboarding rather than a blank screen.
        setPhase('onboarding');
      }
    })();
  }, [enterApp]);

  // Restore gate finished with a successful auto-restore: continue as an already-onboarded launch.
  const handleRestored = useCallback(() => { enterApp().catch(() => setPhase('onboarding')); }, [enterApp]);
  // No backup (or user skipped): proceed to normal first-run onboarding.
  const handleNoRestore = useCallback(() => { setPhase('onboarding'); }, []);
  // Fresh setup complete: arm auto-backup and write a first baseline snapshot.
  const handleOnboardingDone = useCallback(() => {
    (async () => {
      await initAutoBackup();
      backupNow().catch(() => {});
      setPhase('unlocked');
    })();
  }, []);

  const navTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.neutral0,
        card: colors.surfaceCard,
        text: colors.neutral900,
        border: colors.surfaceBorder,
        primary: colors.accent500,
      },
    };
  }, [isDark, colors]);

  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral0 }}>
        <ActivityIndicator color={colors.accent500} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral0, paddingTop: insets.top }}>
      {/* paddingTop: insets.top keeps content below the status bar / camera cutout even when
          Android 15+ forces edge-to-edge (target SDK 36). The neutral0 background fills the
          status-bar strip so the bar reads cleanly in both themes. */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.neutral0}
        translucent={false}
      />
      {phase === 'restore' && <RestoreGateScreen onRestored={handleRestored} onContinue={handleNoRestore} />}
      {phase === 'onboarding' && <OnboardingNavigator onComplete={handleOnboardingDone} />}
      {phase === 'locked' && <LockScreen onUnlock={() => setPhase('unlocked')} />}
      {phase === 'unlocked' && (
        <NavigationContainer theme={navTheme}>
          <TourProvider>
            <RootNavigator />
          </TourProvider>
        </NavigationContainer>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <AppInner />
          </ConfirmProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
