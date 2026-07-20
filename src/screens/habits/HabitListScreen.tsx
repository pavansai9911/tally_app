import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Modal } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { todayKey } from '@/utils/format';
import { getTodayHabitsWithStatus, listHabits, upsertLog, deleteLog, calculateStreaks, Habit, HabitLog } from '@/db';
import { HabitsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitList'>;
type TodayHabit = Habit & { log: HabitLog | null; streak: number };

export default function HabitListScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [todayHabits, setTodayHabits] = useState<TodayHabit[]>([]);
  const [allHabits, setAllHabits] = useState<Array<Habit & { streak: number }>>([]);
  const [sheetHabit, setSheetHabit] = useState<TodayHabit | null>(null);
  const [logValue, setLogValue] = useState('');

  const load = useCallback(async () => {
    const today = todayKey();
    const th = await getTodayHabitsWithStatus(today);
    setTodayHabits(th);
    const all = await listHabits();
    const withStreaks = await Promise.all(all.map(async h => ({ ...h, streak: (await calculateStreaks(h, today)).current })));
    setAllHabits(withStreaks);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function quickToggle(habit: TodayHabit) {
    const today = todayKey();
    if (habit.log?.status === 'done') {
      await deleteLog(habit.id, today);
    } else if (habit.goal_type === 'boolean') {
      await upsertLog(habit.id, today, 'done', 1);
    } else {
      setSheetHabit(habit);
      setLogValue(habit.log?.value ? String(habit.log.value) : '');
      return;
    }
    load();
  }

  async function saveSheetAction(status: 'done' | 'partial' | 'skipped') {
    if (!sheetHabit) return;
    const today = todayKey();
    const val = parseFloat(logValue) || sheetHabit.goal_value || 1;
    await upsertLog(sheetHabit.id, today, status, val);
    setSheetHabit(null);
    load();
  }

  const doneCount = todayHabits.filter(h => h.log?.status === 'done').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900 }}>Habits</Text>
        <Feather name="shuffle" size={20} color={tab === 'all' ? colors.accent500 : colors.neutral900} />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 14, gap: 8 }}>
        <Pressable onPress={() => setTab('today')} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tab === 'today' ? colors.neutral900 : colors.neutral50 }}>
          <Text style={{ ...typography.bodySmallMedium, color: tab === 'today' ? colors.neutral0 : colors.neutral600 }}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setTab('all')} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tab === 'all' ? colors.neutral900 : colors.neutral50 }}>
          <Text style={{ ...typography.bodySmallMedium, color: tab === 'all' ? colors.neutral0 : colors.neutral600 }}>All habits</Text>
        </Pressable>
      </View>

      {tab === 'today' && todayHabits.length > 0 && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 8, backgroundColor: colors.neutral100, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${(doneCount / todayHabits.length) * 100}%`, height: '100%', backgroundColor: colors.accent500 }} />
          </View>
          <Text style={{ ...typography.caption, color: colors.neutral500 }}>{doneCount} of {todayHabits.length} done</Text>
        </View>
      )}

      {(tab === 'today' ? todayHabits : allHabits).length === 0 ? (
        <EmptyState
          icon={<Feather name="check-square" size={40} color={colors.neutral400} />}
          title="No habits yet"
          description="Start building a routine, or break one. Add your first habit to begin tracking streaks"
          actionLabel="Add habit"
          onAction={() => navigation.navigate('AddEditHabit', undefined)}
        />
      ) : tab === 'today' ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
          {todayHabits.map(h => {
            const done = h.log?.status === 'done';
            return (
              <Pressable
                key={h.id}
                onPress={() => quickToggle(h)}
                onLongPress={() => { setSheetHabit(h); setLogValue(h.log?.value ? String(h.log.value) : ''); }}
                onPressIn={() => navigation.navigate('HabitDetail', { id: h.id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: done ? 0.5 : 1.5, borderColor: done ? colors.surfaceBorder : colors.accent500, borderRadius: radius.lg, marginBottom: 10, opacity: done ? 0.6 : 1 }}
              >
                <Pressable onPress={() => quickToggle(h)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: done ? colors.income : 'transparent', borderWidth: done ? 0 : 2, borderColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' }}>
                  {done && <Feather name="check" size={20} color="#FFFFFF" />}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyMedium, color: colors.neutral900, textDecorationLine: done ? 'line-through' : 'none' }}>{h.name}</Text>
                  <Text style={{ ...typography.caption, color: colors.neutral400 }}>
                    {h.goal_type !== 'boolean' ? `${h.log?.value ?? 0} of ${h.goal_value} ${h.goal_unit ?? ''}` : done ? 'Done' : 'Tap to log'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 9, backgroundColor: h.streak > 0 ? colors.incomeTint : colors.neutral50, borderRadius: 10 }}>
                  <Feather name="zap" size={13} color={h.streak > 0 ? colors.income : colors.neutral400} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: h.streak > 0 ? colors.income : colors.neutral400 }}>{h.streak}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
          {['build', 'quit'].map(group => {
            const items = allHabits.filter(h => h.type === group);
            if (items.length === 0) return null;
            return (
              <View key={group}>
                <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginTop: 16, marginBottom: 10 }}>
                  {group === 'build' ? 'Building' : 'Quitting'} ({items.length})
                </Text>
                {items.map(h => (
                  <Pressable key={h.id} onPress={() => navigation.navigate('HabitDetail', { id: h.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
                    <Feather name="more-vertical" size={16} color={colors.neutral300} />
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: h.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={mapIcon(h.icon)} size={17} color={h.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{h.name}</Text>
                      <Text style={{ ...typography.caption, color: colors.neutral400 }}>
                        {h.schedule_type === 'daily' ? 'Every day' : h.schedule_type === 'specific_days' ? 'Specific days' : h.schedule_type}
                        {h.goal_value ? ` · ${h.goal_value} ${h.goal_unit ?? ''}` : ''}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.neutral300} />
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Pressable
        onPress={() => navigation.navigate('AddEditHabit', undefined)}
        style={{ position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </Pressable>

      <Modal visible={!!sheetHabit} transparent animationType="slide" onRequestClose={() => setSheetHabit(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(19,22,26,0.45)', justifyContent: 'flex-end' }} onPress={() => setSheetHabit(null)}>
          <Pressable style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.neutral200, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />
            {sheetHabit && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: sheetHabit.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={mapIcon(sheetHabit.icon)} size={21} color={sheetHabit.color} />
                  </View>
                  <Text style={{ ...typography.h3, color: colors.neutral900 }}>{sheetHabit.name}</Text>
                </View>
                {sheetHabit.goal_type !== 'boolean' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 8 }}>
                      Log {sheetHabit.goal_unit ?? 'value'}
                    </Text>
                    <View style={{ height: 48, borderWidth: 1.5, borderColor: colors.accent500, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}>
                      <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{logValue || '0'} {sheetHabit.goal_unit}</Text>
                    </View>
                  </View>
                )}
                <SheetButton label="Mark as done" icon="check" color={colors.income} bg={colors.incomeTint} onPress={() => saveSheetAction('done')} />
                <SheetButton label="Mark as partial" icon="circle" color={colors.warning} bg={colors.warningTint} onPress={() => saveSheetAction('partial')} />
                <SheetButton label="Skip today" icon="skip-forward" color={colors.neutral600} bg={colors.neutral50} onPress={() => saveSheetAction('skipped')} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SheetButton({ label, icon, color, bg, onPress }: { label: string; icon: string; color: string; bg: string; onPress: () => void }) {
  const { colors, typography, radius } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ height: 50, backgroundColor: bg, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 8 }}>
      <Feather name={icon} size={18} color={color} />
      <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{label}</Text>
    </Pressable>
  );
}
