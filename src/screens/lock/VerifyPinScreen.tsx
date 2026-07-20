import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { lockColors } from '@/theme/colors';
import { haptic } from '@/utils/haptics';
import { verifyPin } from '@/services/lock';

const PIN_LENGTH = 4;

/**
 * Verifies the user's CURRENT PIN before a sensitive action (turning the lock off,
 * changing the PIN). Only someone who knows the PIN can proceed.
 */
export default function VerifyPinScreen({
  onSuccess,
  onCancel,
  title = 'Enter your PIN',
  subtitle = 'Confirm your PIN to continue',
}: {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function check(entered: string) {
    const ok = await verifyPin(entered);
    if (ok) {
      haptic('notificationSuccess');
      onSuccess();
    } else {
      haptic('notificationError');
      setError(true);
      setPin('');
    }
  }

  function handleDigit(d: string) {
    const next = pin + d;
    if (next.length <= PIN_LENGTH) {
      haptic('selection');
      setError(false);
      setPin(next);
      if (next.length === PIN_LENGTH) setTimeout(() => check(next), 120);
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: lockColors.background }}>
      <Pressable onPress={onCancel} style={{ padding: 16 }} accessibilityLabel="Cancel">
        <Feather name="x" size={24} color="#FFFFFF" />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 24 }}>
        <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: lockColors.keypadButton, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Feather name="lock" size={26} color={lockColors.accent} />
        </View>
        <Text style={{ fontSize: 19, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: error ? lockColors.expense : lockColors.textSecondary, marginBottom: 28, textAlign: 'center' }}>
          {error ? 'Incorrect PIN — try again' : subtitle}
        </Text>

        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 36 }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: i < pin.length ? (error ? lockColors.expense : lockColors.accent) : 'transparent',
                borderWidth: i < pin.length ? 0 : 1.5,
                borderColor: lockColors.dotEmptyBorder,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <KeypadButton key={d} label={d} onPress={() => handleDigit(d)} />
          ))}
          <View style={{ width: 80, height: 80 }} />
          <KeypadButton label="0" onPress={() => handleDigit('0')} />
          <Pressable onPress={handleBackspace} accessibilityLabel="Delete" style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="delete" size={22} color={lockColors.textSecondary} />
          </Pressable>
        </View>
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
