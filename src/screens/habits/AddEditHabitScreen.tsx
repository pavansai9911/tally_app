import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, SegmentOption, ToggleSwitch } from '@/components/ui';
import { TimeField } from '@/components/DateTimeField';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { mapIcon, HABIT_ICON_OPTIONS } from '@/utils/iconMap';
import { createHabit, updateHabit, getHabit } from '@/db';
import { haptic } from '@/utils/haptics';
import {
  requestNotificationPermission,
  scheduleHabitReminder,
  cancelHabitReminder,
} from '@/services/notifications';
import { HabitsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<HabitsStackParamList, 'AddEditHabit'>;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function AddEditHabitScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICON_OPTIONS[0]);
  const [type, setType] = useState<'build' | 'quit'>('build');
  const [goalType, setGoalType] = useState<'boolean' | 'count' | 'duration'>('boolean');
  const [goalValue, setGoalValue] = useState('30');
  const [goalUnit, setGoalUnit] = useState('min');
  const [scheduleType, setScheduleType] = useState<'daily' | 'specific_days'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 2, 4]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editId) {
      getHabit(editId).then(h => {
        if (h) {
          setName(h.name);
          setIcon(h.icon);
          setType(h.type);
          setGoalType(h.goal_type);
          setGoalValue(h.goal_value ? String(h.goal_value) : '');
          setGoalUnit(h.goal_unit ?? '');
          setScheduleType(h.schedule_type === 'daily' ? 'daily' : 'specific_days');
          if (h.schedule_days) setSelectedDays(JSON.parse(h.schedule_days));
          setReminderEnabled(!!h.reminder_enabled);
          setReminderTime(h.reminder_time ?? '07:00');
        }
      });
    }
  }, [editId]);

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function handleSave() {
    if (!name.trim()) {
      haptic('notificationWarning');
      return;
    }
    if (scheduleType === 'specific_days' && selectedDays.length === 0) {
      haptic('notificationWarning');
      return;
    }
    const payload = {
      name: name.trim(), type, goal_type: goalType,
      goal_value: goalType !== 'boolean' ? parseFloat(goalValue) || null : null,
      goal_unit: goalType !== 'boolean' ? goalUnit : null,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'specific_days' ? JSON.stringify(selectedDays) : null,
      schedule_target: null,
      icon, color: '#3D5AFE',
      reminder_enabled: reminderEnabled ? 1 : 0,
      reminder_time: reminderEnabled ? reminderTime : null,
    };
    const habitId = editId ? (await updateHabit(editId, payload), editId) : await createHabit(payload);

    // Schedule or cancel the local reminder for this habit.
    if (reminderEnabled) {
      await requestNotificationPermission();
      const savedHabit = await getHabit(habitId);
      if (savedHabit) await scheduleHabitReminder(savedHabit);
    } else {
      await cancelHabitReminder(habitId);
    }

    haptic('notificationSuccess');
    setSaved(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <SuccessOverlay
        visible={saved}
        message={editId ? 'Habit updated' : 'Habit created'}
        onDone={() => { setSaved(false); navigation.goBack(); }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit habit' : 'New habit'}</Text>
        <Pressable onPress={handleSave}><Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.accent500 }}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <View style={{ width: 60, height: 60, borderRadius: 17, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={mapIcon(icon)} size={26} color={colors.accent500} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {HABIT_ICON_OPTIONS.map(opt => (
            <Pressable key={opt} onPress={() => setIcon(opt)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: opt === icon ? colors.accent500 : colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(opt)} size={16} color={opt === icon ? '#FFFFFF' : colors.neutral500} />
            </Pressable>
          ))}
        </View>

        <Input value={name} onChangeText={setName} placeholder="Habit name" focused />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          <SegmentOption label="Build" selected={type === 'build'} onPress={() => setType('build')} />
          <SegmentOption label="Quit" selected={type === 'quit'} onPress={() => setType('quit')} />
        </View>

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Goal type</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <SegmentOption label="Yes/No" selected={goalType === 'boolean'} onPress={() => setGoalType('boolean')} />
          <SegmentOption label="Count" selected={goalType === 'count'} onPress={() => { setGoalType('count'); setGoalUnit('times'); }} />
          <SegmentOption label="Duration" selected={goalType === 'duration'} onPress={() => { setGoalType('duration'); setGoalUnit('min'); }} />
        </View>

        {goalType !== 'boolean' && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Input value={goalValue} onChangeText={t => setGoalValue(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="30" />
            </View>
            <View style={{ flex: 1 }}>
              <Input value={goalUnit} onChangeText={setGoalUnit} placeholder="min" />
            </View>
          </View>
        )}

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Schedule</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <SegmentOption label="Every day" selected={scheduleType === 'daily'} onPress={() => setScheduleType('daily')} />
          <SegmentOption label="Specific days" selected={scheduleType === 'specific_days'} onPress={() => setScheduleType('specific_days')} />
        </View>

        {scheduleType === 'specific_days' && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
            {WEEKDAYS.map((d, i) => {
              const selected = selectedDays.includes(i);
              return (
                <Pressable key={i} onPress={() => toggleDay(i)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selected ? colors.accent500 : colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '600', color: selected ? '#FFFFFF' : colors.neutral400 }}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="bell" size={18} color={colors.neutral900} />
              <View>
                <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Reminder</Text>
                <Text style={{ ...typography.caption, color: colors.neutral400 }}>
                  {reminderEnabled ? 'A notification on your scheduled days' : 'Off'}
                </Text>
              </View>
            </View>
            <ToggleSwitch value={reminderEnabled} onValueChange={setReminderEnabled} />
          </View>
          {reminderEnabled && <TimeField label="Reminder time" value={reminderTime} onChange={setReminderTime} />}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
        <Button label={editId ? 'Save changes' : 'Create habit'} onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
}
