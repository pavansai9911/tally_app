import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { mapIcon } from '@/utils/iconMap';
import { todayKey, toDateKey, formatMonthYear } from '@/utils/format';
import {
  getHabit, calculateStreaks, getLogsInRange, archiveHabit, deleteHabitPermanently,
  Habit, HabitLog,
} from '@/db';
import { HabitsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitDetail'>;

export default function HabitDetailScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0, totalCompletions: 0, rate30d: 0 });
  const [logs, setLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    (async () => {
      const h = await getHabit(route.params.id);
      setHabit(h);
      if (h) {
        const today = todayKey();
        setStreaks(await calculateStreaks(h, today));
        const start = new Date();
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        setLogs(await getLogsInRange(h.id, toDateKey(start), toDateKey(end)));
      }
    })();
  }, [route.params.id]);

  if (!habit) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }} />;

  function confirmDelete() {
    Alert.alert(
      `Delete "${habit?.name}"?`,
      `This permanently deletes the habit and all ${streaks.totalCompletions} check-ins, including your ${streaks.longest}-day longest streak. This can't be undone.`,
      [
        { text: 'Archive instead', onPress: async () => { await archiveHabit(habit!.id); navigation.goBack(); } },
        { text: 'Delete habit and logs', style: 'destructive', onPress: async () => { await deleteHabitPermanently(habit!.id); navigation.goBack(); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const logMap = new Map(logs.map(l => [l.log_date, l]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={() => navigation.navigate('AddEditHabit', { id: habit.id })}><Feather name="edit-2" size={20} color={colors.neutral900} /></Pressable>
          <Pressable onPress={confirmDelete}><Feather name="more-horizontal" size={20} color={colors.neutral900} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: habit.color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={mapIcon(habit.icon)} size={22} color={habit.color} />
          </View>
          <View>
            <Text style={{ ...typography.h2, color: colors.neutral900 }}>{habit.name}</Text>
            <Text style={{ ...typography.caption, color: colors.neutral400 }}>
              {habit.schedule_type === 'daily' ? 'Every day' : 'Specific days'}{habit.goal_value ? ` · ${habit.goal_value} ${habit.goal_unit}` : ''}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <StatTile icon="zap" value={String(streaks.current)} label="Current" bg={colors.incomeTint} color={colors.income} />
          <StatTile icon="award" value={String(streaks.longest)} label="Longest" bg={colors.neutral50} color={colors.neutral600} />
          <StatTile icon="percent" value={`${streaks.rate30d}%`} label="Rate" bg={colors.neutral50} color={colors.neutral600} />
        </View>

        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>
          {formatMonthYear(now)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logMap.get(dateStr);
            const isToday = dateStr === todayKey();
            const isFuture = new Date(dateStr) > new Date();
            let bg = colors.neutral100;
            if (log?.status === 'done') bg = colors.income;
            else if (log?.status === 'partial') bg = '#C8E6D7';
            return (
              <View
                key={day}
                style={{
                  width: 28, height: 28, borderRadius: 7, backgroundColor: isFuture ? colors.neutral50 : bg,
                  borderWidth: isToday ? 1.5 : isFuture ? 1 : 0, borderColor: isToday ? colors.neutral900 : colors.neutral200,
                  borderStyle: isFuture ? 'dashed' : 'solid',
                }}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
          <LegendDot color={colors.income} label="Done" />
          <LegendDot color="#C8E6D7" label="Partial" />
          <LegendDot color={colors.neutral100} label="Skipped" />
        </View>

        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>Statistics</Text>
        <View style={{ backgroundColor: colors.neutral50, borderRadius: radius.lg, paddingHorizontal: 16 }}>
          <StatRow label="Total completions" value={String(streaks.totalCompletions)} />
          <StatRow label="Last 30 days" value={`${streaks.rate30d}%`} />
          {habit.goal_unit && <StatRow label={`Avg. ${habit.goal_unit}`} value={String(habit.goal_value ?? '—')} />}
          <StatRow label="Longest streak" value={`${streaks.longest} days`} last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ icon, value, label, bg, color }: { icon: string; value: string; label: string; bg: string; color: string }) {
  const { typography, radius } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14, backgroundColor: bg, borderRadius: radius.lg, alignItems: 'center' }}>
      <Feather name={icon} size={18} color={color} />
      <Text style={{ ...typography.h3, color: '#13161A', marginTop: 6 }}>{value}</Text>
      <Text style={{ fontSize: 11, color, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.neutral400 }}>{label}</Text>
    </View>
  );
}

function StatRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
      <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{label}</Text>
      <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{value}</Text>
    </View>
  );
}
