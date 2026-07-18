import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { parseDateKey, toDateKey, formatFullDate } from '@/utils/format';

/** Row that opens the native date picker; value/onChange use 'YYYY-MM-DD' local keys. */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const { colors, typography } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatFullDate(value)}`}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}
      >
        <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{formatFullDate(value)}</Text>
          <Feather name="calendar" size={16} color={colors.neutral400} />
        </View>
      </Pressable>
      {show && (
        <DateTimePicker
          value={parseDateKey(value)}
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === 'set' && selected) onChange(toDateKey(selected));
          }}
        />
      )}
    </>
  );
}

/** Row that opens the native time picker; value/onChange use 'HH:MM' 24h strings. */
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
}) {
  const { colors, typography } = useTheme();
  const [show, setShow] = useState(false);
  const [h, m] = value.split(':').map(Number);
  const current = new Date();
  current.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);

  const display12 = () => {
    const hh = Number.isNaN(h) ? 9 : h;
    const mm = Number.isNaN(m) ? 0 : m;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display12()}`}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
      >
        <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{display12()}</Text>
          <Feather name="clock" size={16} color={colors.neutral400} />
        </View>
      </Pressable>
      {show && (
        <DateTimePicker
          value={current}
          mode="time"
          is24Hour={false}
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === 'set' && selected) {
              onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
            }
          }}
        />
      )}
    </>
  );
}
