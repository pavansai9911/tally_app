import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { lockColors } from '@/theme/colors';
import { useConfirm } from '@/components/ConfirmDialog';
import { haptic } from '@/utils/haptics';
import {
  verifyPin,
  clearPin,
  isBiometricAvailable,
  isBiometricEnabled,
  authenticateBiometric,
} from '@/services/lock';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;
const PIN_LENGTH = 4;

type LockState = 'entry' | 'wrong' | 'lockout';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const confirm = useConfirm();
  const [pin, setPin] = useState('');
  const [state, setState] = useState<LockState>('entry');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [countdown, setCountdown] = useState(LOCKOUT_SECONDS);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tryBiometric = useCallback(async () => {
    const ok = await authenticateBiometric('Unlock Tally');
    if (ok) {
      haptic('notificationSuccess');
      onUnlock();
    }
  }, [onUnlock]);

  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      const available = await isBiometricAvailable();
      const show = enabled && available;
      setBiometricAvailable(show);
      if (show) tryBiometric();
    })();
  }, [tryBiometric]);

  useEffect(() => {
    if (state === 'lockout') {
      setCountdown(LOCKOUT_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setState('entry');
            setAttemptsLeft(MAX_ATTEMPTS);
            return LOCKOUT_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [state]);

  async function checkPin(entered: string) {
    const ok = await verifyPin(entered);
    if (ok) {
      haptic('notificationSuccess');
      onUnlock();
      return;
    }
    haptic('notificationError');
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setPin('');
    setState(remaining <= 0 ? 'lockout' : 'wrong');
  }

  function handleDigit(d: string) {
    if (state === 'lockout') return;
    // After a wrong attempt the dots were frozen showing 4 red; start a fresh entry on the
    // first new keypress so the dots track input again (otherwise it felt like input was ignored).
    const base = state === 'wrong' ? '' : pin;
    if (state === 'wrong') setState('entry');
    const next = base + d;
    if (next.length <= PIN_LENGTH) {
      haptic('selection');
      setPin(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => checkPin(next), 120);
      }
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
    if (state === 'wrong') setState('entry');
  }

  function handleForgotPin() {
    confirm({
      title: 'Reset app lock?',
      message: 'Turning off the lock keeps all your data on this device — nothing is deleted. You can set a new PIN later in Settings.',
      icon: 'unlock',
      tone: 'danger',
      buttons: [
        { text: 'Turn off lock', style: 'destructive', onPress: async () => { await clearPin(); onUnlock(); } },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }

  const dotColor = state === 'wrong' ? lockColors.expense : lockColors.accent;
  const filledCount = state === 'wrong' ? PIN_LENGTH : pin.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: lockColors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 }}>
        <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: lockColors.keypadButton, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Feather name="layers" size={28} color={lockColors.accent} />
        </View>

        {state === 'lockout' ? (
          <>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#3A1816', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Feather name="lock" size={38} color={lockColors.expense} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' }}>Tally is locked</Text>
            <Text style={{ fontSize: 13, color: lockColors.textSecondary, textAlign: 'center', marginBottom: 28 }}>
              Too many incorrect attempts. Try again in 0:{countdown.toString().padStart(2, '0')}
            </Text>
            <View style={{ width: '100%', padding: 14, backgroundColor: lockColors.keypadButton, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Feather name="clock" size={16} color={lockColors.textSecondary} />
              <Text style={{ fontSize: 13, color: lockColors.textSecondary, fontWeight: '500' }}>Retry available shortly</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 }}>Enter your PIN</Text>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: state === 'wrong' ? 10 : 36 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 14, height: 14, borderRadius: 7,
                    backgroundColor: i < filledCount ? dotColor : 'transparent',
                    borderWidth: i < filledCount ? 0 : 1.5,
                    borderColor: lockColors.dotEmptyBorder,
                  }}
                />
              ))}
            </View>
            {state === 'wrong' && (
              <Text style={{ fontSize: 13, color: lockColors.expense, fontWeight: '500', marginBottom: 26 }}>
                Incorrect PIN — {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
              </Text>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <KeypadButton key={d} label={d} onPress={() => handleDigit(d)} />
              ))}
              {biometricAvailable ? (
                <Pressable onPress={tryBiometric} accessibilityLabel="Unlock with biometrics" style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="unlock" size={24} color={lockColors.accent} />
                </Pressable>
              ) : (
                <View style={{ width: 80, height: 80 }} />
              )}
              <KeypadButton label="0" onPress={() => handleDigit('0')} />
              <Pressable onPress={handleBackspace} accessibilityLabel="Delete" style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="delete" size={22} color={lockColors.textSecondary} />
              </Pressable>
            </View>

            <Pressable onPress={handleForgotPin} hitSlop={8}>
              <Text style={{ fontSize: 13, color: lockColors.accent, fontWeight: '700', marginTop: 28 }}>Forgot PIN?</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function KeypadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Digit ${label}`}
      style={({ pressed }) => ({
        width: 80, height: 80, borderRadius: 40, backgroundColor: lockColors.keypadButton,
        alignItems: 'center', justifyContent: 'center', marginBottom: 18,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 22, fontWeight: '500', color: '#FFFFFF' }}>{label}</Text>
    </Pressable>
  );
}
