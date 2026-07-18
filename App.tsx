import React, { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { getDb, hasCompletedOnboarding, getSetting } from '@/db';
import { RootNavigator } from '@/navigation/RootNavigator';
import OnboardingNavigator from '@/screens/onboarding/OnboardingNavigator';
import LockScreen from '@/screens/lock/LockScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { runStartupTasks } from '@/services/startup';
import { isPinSet, isBiometricAvailable } from '@/services/lock';

type AppPhase = 'loading' | 'onboarding' | 'locked' | 'unlocked';

function AppInner() {
  const { colors, isDark } = useTheme();
  const [phase, setPhase] = useState<AppPhase>('loading');

  useEffect(() => {
    (async () => {
      try {
        await getDb(); // runs migrations + seeds defaults
        const onboarded = await hasCompletedOnboarding();
        if (!onboarded) {
          setPhase('onboarding');
          return;
        }
        await runStartupTasks();
        const lockEnabled = (await getSetting('lock_enabled')) === '1';
        const biometricEnabled = (await getSetting('biometric_enabled')) === '1';
        // Only actually lock if we have a real credential to check against.
        const canLock = lockEnabled && ((await isPinSet()) || (biometricEnabled && (await isBiometricAvailable())));
        setPhase(canLock ? 'locked' : 'unlocked');
      } catch {
        // Fail safe: send the user to onboarding rather than a blank screen.
        setPhase('onboarding');
      }
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
    <View style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {phase === 'onboarding' && <OnboardingNavigator onComplete={() => setPhase('unlocked')} />}
      {phase === 'locked' && <LockScreen onUnlock={() => setPhase('unlocked')} />}
      {phase === 'unlocked' && (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
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
          <AppInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
