import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { getDb, hasCompletedOnboarding, getSetting } from '@/db';
import { RootNavigator } from '@/navigation/RootNavigator';
import OnboardingNavigator from '@/screens/onboarding/OnboardingNavigator';
import LockScreen from '@/screens/lock/LockScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

type AppPhase = 'loading' | 'onboarding' | 'locked' | 'unlocked';

function AppInner() {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    (async () => {
      await getDb(); // initializes schema + seeds default categories
      const onboarded = await hasCompletedOnboarding();
      if (!onboarded) {
        setPhase('onboarding');
        return;
      }
      const lockEnabled = await getSetting('lock_enabled');
      setPhase(lockEnabled === '1' ? 'locked' : 'unlocked');
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && phase !== 'loading') {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, phase]);

  if (!fontsLoaded || phase === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color={colors.accent500} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style="auto" />
      {phase === 'onboarding' && (
        <OnboardingNavigator onComplete={() => setPhase('unlocked')} />
      )}
      {phase === 'locked' && (
        <LockScreen onUnlock={() => setPhase('unlocked')} />
      )}
      {phase === 'unlocked' && (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
