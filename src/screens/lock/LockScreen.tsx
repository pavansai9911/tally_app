import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { getSetting } from '@/db';
import { lockColors } from '@/theme/colors';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

type LockState = 'entry' | 'wrong' | 'lockout';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [state, setState] = useState<LockState>('entry');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [countdown, setCountdown] = useState(LOCKOUT_SECONDS);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getSetting('app_pin');
      setStoredPin(p);
      const biometricEnabled = await getSetting('biometric_enabled');
      if (biometricEnabled === '1') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
        if (hasHardware && isEnrolled) tryBiometric();
      }
    })();
  }, []);

  useEffect(() => {
    if (state === 'lockout') {
      setCountdown(LOCKOUT_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setState('entry');
            setAttemptsLeft(MAX_ATTEMPTS);
            return LOCKOUT_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [state]);

  async function tryBiometric() {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Tally' });
    if (result.success) onUnlock();
  }

  function handleDigit(d: string) {
    if (state === 'lockout') return;
    const next = pin + d;
    if (next.length <= 4) {
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => checkPin(next), 150);
      }
    }
  }

  function checkPin(entered: string) {
    // If no PIN was ever set (e.g. only biometric chosen), accept any 4-digit entry as a no-op pass-through
    // to avoid locking the user out entirely in a zero-budget offline-only flow.
    if (!storedPin || entered === storedPin) {
      onUnlock();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setPin('');
    if (remaining <= 0) {
      setState('lockout');
    } else {
      setState('wrong');
    }
  }

  function handleBackspace() {
    setPin(prev => prev.slice(0, -1));
    if (state === 'wrong') setState('entry');
  }

  const dotColor = state === 'wrong' ? lockColors.expense : lockColors.accent;
  const filledCount = state === 'wrong' ? 4 : pin.length;

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
              {[0, 1, 2, 3].map(i => (
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
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <KeypadButton key={d} label={d} onPress={() => handleDigit(d)} />
              ))}
              {biometricAvailable ? (
                <Pressable onPress={tryBiometric} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="unlock" size={24} color={lockColors.accent} />
                </Pressable>
              ) : (
                <View style={{ width: 80, height: 80 }} />
              )}
              <KeypadButton label="0" onPress={() => handleDigit('0')} />
              <Pressable onPress={handleBackspace} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="delete" size={22} color={lockColors.textSecondary} />
              </Pressable>
            </View>

            {state === 'wrong' && (
              <Pressable onPress={() => { /* recovery flow placeholder */ }}>
                <Text style={{ fontSize: 13, color: lockColors.accent, fontWeight: '700', marginTop: 28 }}>Forgot PIN?</Text>
              </Pressable>
            )}
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
