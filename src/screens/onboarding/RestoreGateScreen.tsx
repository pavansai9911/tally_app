import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, SafeAreaView, AppState, AppStateStatus, ActivityIndicator, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import {
  isNativeBackupAvailable, isPermissionGranted, requestPermission, tryAutoRestore,
} from '@/services/autoBackup';

/**
 * Shown once on a first launch (before onboarding). If All-files access is granted and a valid
 * Tally-tracker backup exists on this device, it restores automatically and the app opens on the
 * user's real data — as if it was never uninstalled. Otherwise it offers to enable the on-device
 * backup, and "Not now" / no-backup falls through to normal first-run onboarding.
 */
export default function RestoreGateScreen({
  onRestored,
  onContinue,
}: {
  onRestored: () => void;
  onContinue: () => void;
}) {
  const { colors, typography, radius } = useTheme();
  const [status, setStatus] = useState<'checking' | 'prompt' | 'restoring'>('checking');
  const done = useRef(false);
  const awaitingGrant = useRef(false);

  const finish = useCallback((restored: boolean) => {
    if (done.current) return;
    done.current = true;
    if (restored) onRestored(); else onContinue();
  }, [onRestored, onContinue]);

  // Attempt a restore if permission is granted; returns whether we finished the flow.
  const attempt = useCallback(async (): Promise<boolean> => {
    if (!(await isPermissionGranted())) return false;
    setStatus('restoring');
    const restored = await tryAutoRestore();
    // Granted but no valid backup -> genuine fresh install: continue to onboarding.
    finish(restored);
    return true;
  }, [finish]);

  // First mount: skip the gate entirely if the native module is unavailable or if permission is
  // already granted (go straight to the restore attempt). Otherwise show the prompt.
  useEffect(() => {
    (async () => {
      if (!isNativeBackupAvailable()) { finish(false); return; }
      const handled = await attempt();
      if (!handled) setStatus('prompt');
    })();
  }, [attempt, finish]);

  // When the user returns from the system permission screen, re-check and proceed if granted.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && awaitingGrant.current) {
        awaitingGrant.current = false;
        attempt().then((handled) => { if (!handled) setStatus('prompt'); });
      }
    });
    return () => sub.remove();
  }, [attempt]);

  const onEnable = useCallback(async () => {
    awaitingGrant.current = true;
    await requestPermission();
    // If already granted (e.g. pre-R runtime grant returns synchronously), proceed now too.
    const handled = await attempt();
    if (handled) awaitingGrant.current = false;
  }, [attempt]);

  if (status === 'checking' || status === 'restoring') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <ActivityIndicator color={colors.accent500} />
          <Text style={{ ...typography.body, color: colors.neutral500, marginTop: 16, textAlign: 'center' }}>
            {status === 'restoring' ? 'Restoring your data…' : 'Checking for a backup…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Feather name="shield" size={40} color={colors.accent500} />
        </View>
        <Text style={{ ...typography.h1, color: colors.neutral900, textAlign: 'center', marginBottom: 10 }}>
          Keep your data safe
        </Text>
        <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
          Tally can keep a private, encrypted backup in a “Tally-tracker” folder on this device.
          It stays here — never uploaded anywhere — and lets your data come back automatically if
          you ever reinstall the app.
        </Text>

        <View style={{ width: '100%', gap: 12 }}>
          <Row icon="lock" text="Encrypted and locked to this device" colors={colors} typography={typography} radius={radius} />
          <Row icon="wifi-off" text="Fully offline — nothing leaves your phone" colors={colors} typography={typography} radius={radius} />
          <Row icon="rotate-ccw" text="Automatic restore after a reinstall" colors={colors} typography={typography} radius={radius} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 36, gap: 8 }}>
        <Button label="Enable backup" onPress={onEnable} />
        <Pressable onPress={() => finish(false)} accessibilityRole="button" style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral500 }}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ icon, text, colors, typography, radius }: {
  icon: string;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  radius: ReturnType<typeof useTheme>['radius'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.neutral50, borderRadius: radius.lg }}>
      <Feather name={icon} size={18} color={colors.accent500} />
      <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900, flex: 1 }}>{text}</Text>
    </View>
  );
}
