import React from 'react';
import { Pressable, Text, View, TextInput, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Button({
  label, onPress, variant = 'primary', disabled = false, icon, loading = false, fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructiveSolid' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { colors, radius, typography } = useTheme();

  const styles: Record<string, { bg: string; fg: string }> = {
    primary: { bg: disabled ? colors.neutral200 : colors.accent500, fg: disabled ? colors.neutral400 : '#FFFFFF' },
    secondary: { bg: colors.neutral50, fg: colors.neutral900 },
    destructive: { bg: colors.expenseTint, fg: colors.expense },
    destructiveSolid: { bg: colors.expense, fg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: colors.neutral400 },
  };
  const s = styles[variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => ({
        backgroundColor: s.bg,
        borderRadius: radius.lg,
        height: 52,
        width: fullWidth ? '100%' : undefined,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <>
          {icon}
          <Text style={{ ...typography.button, color: s.fg }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style, sunken = false }: { children: React.ReactNode; style?: ViewStyle; sunken?: boolean }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        backgroundColor: sunken ? colors.surfaceSunken : colors.surfaceCard,
        borderRadius: radius.lg,
        padding: spacing.s4,
        borderWidth: sunken ? 0 : 0.5,
        borderColor: colors.surfaceBorder,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

export function Input({
  value, onChangeText, placeholder, label, keyboardType = 'default', focused = false, error = false, editable = true,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  focused?: boolean;
  error?: boolean;
  editable?: boolean;
}) {
  const { colors, radius, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.s5 }}>
      {label && (
        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral400}
        keyboardType={keyboardType}
        editable={editable}
        style={{
          height: 48,
          borderRadius: radius.md,
          borderWidth: error ? 1 : focused ? 1.5 : 1,
          borderColor: error ? colors.expense : focused ? colors.accent500 : colors.neutral200,
          paddingHorizontal: 14,
          backgroundColor: editable ? colors.surfaceCard : colors.neutral50,
          color: colors.neutral900,
          ...typography.body,
        }}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: React.ReactNode }) {
  const { colors, radius, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.neutral900 : colors.neutral50,
        borderRadius: radius.xl,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ ...typography.bodySmallMedium, color: selected ? '#FFFFFF' : colors.neutral600 }}>{label}</Text>
    </Pressable>
  );
}

export function SegmentOption({ label, selected, onPress, selectedBg, selectedFg }: {
  label: string; selected: boolean; onPress: () => void; selectedBg?: string; selectedFg?: string;
}) {
  const { colors, radius, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: selected ? (selectedBg ?? colors.accent500) : colors.neutral50,
        borderRadius: radius.md,
        paddingVertical: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ ...typography.bodySmallMedium, fontWeight: selected ? '700' : '500', color: selected ? (selectedFg ?? '#FFFFFF') : colors.neutral500 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ToggleSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13, padding: 2,
        backgroundColor: value ? colors.accent500 : colors.neutral200,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' }} />
    </Pressable>
  );
}

export function ProgressBar({ progress, color, trackColor }: { progress: number; color: string; trackColor?: string }) {
  const { colors, radius } = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height: 8, backgroundColor: trackColor ?? colors.neutral100, borderRadius: radius.sm, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  );
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: React.ReactNode; title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 }}>
      <View style={{ width: 88, height: 88, borderRadius: radius.xxl, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s6 }}>
        {icon}
      </View>
      <Text style={{ ...typography.h3, color: colors.neutral900, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', marginBottom: spacing.s6, lineHeight: 21 }}>{description}</Text>
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} fullWidth={false} />}
    </View>
  );
}
