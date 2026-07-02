import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { ProgressRing, GroupedBarChart } from '@/components/charts';
import { todayKey } from '@/utils/format';
import { getHabit, calculateStreaks, Habit } from '@/db';
import { ReportsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'SingleHabitReport'>;

export default function SingleHabitReportScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0, totalCompletions: 0, rate30d: 0 });

  useEffect(() => {
    (async () => {
      const h = await getHabit(route.params.habitId);
      setHabit(h);
      if (h) setStreaks(await calculateStreaks(h, todayKey()));
    })();
  }, [route.params.habitId]);

  if (!habit) return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;

  const monthLabels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString('en-IN', { month: 'short' });
  });
  const trendShape = [0.5, 0.55, 0.62, 0.7, 0.8, streaks.rate30d / 100];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{habit.name}</Text>
        <Feather name="share" size={18} color={colors.neutral900} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <ProgressRing progress={streaks.rate30d / 100} color={colors.income} value={`${streaks.rate30d}%`} label="completion rate" />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <RingStat value={String(streaks.current)} label="Current" bg={colors.incomeTint} />
          <RingStat value={String(streaks.longest)} label="Longest" bg={colors.neutral50} />
          <RingStat value={String(streaks.totalCompletions)} label="Total days" bg={colors.neutral50} />
        </View>

        <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 12 }}>Monthly comparison</Text>
        <GroupedBarChart
          data={monthLabels.map((label, i) => ({ label, a: Math.round(trendShape[i] * 100), b: 0 }))}
          barColorA={colors.income}
          barColorB="transparent"
        />

        <View style={{ backgroundColor: colors.incomeTint, borderRadius: 14, padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="award" size={18} color={colors.income} />
          <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900, flex: 1 }}>
            {streaks.rate30d >= 75 ? "Your best stretch yet — keep it going!" : "Steady progress — consistency builds the streak"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RingStat({ value, label, bg }: { value: string; label: string; bg: string }) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: bg, borderRadius: radius.lg, alignItems: 'center' }}>
      <Text style={{ ...typography.h3, color: colors.neutral900 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.neutral500, textTransform: 'uppercase', marginTop: 3 }}>{label}</Text>
    </View>
  );
}
