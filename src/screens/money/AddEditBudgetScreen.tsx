import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, SegmentOption, ToggleSwitch } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmDialog';
import { mapIcon } from '@/utils/iconMap';
import { createBudget, updateBudget, deleteBudget, listCategories, listBudgetsWithSpend, Category } from '@/db';
import { monthKey } from '@/utils/format';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AddEditBudget'>;

export default function AddEditBudgetScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const confirm = useConfirm();
  const editId = route.params?.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [recurrence, setRecurrence] = useState<'monthly' | 'one_time'>('monthly');
  const [alertEnabled, setAlertEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const cats = await listCategories('expense');
      setCategories(cats);
      if (!editId && cats.length > 0) setCategoryId(cats[0].id);
      if (editId) {
        const budgets = await listBudgetsWithSpend(monthKey());
        const b = budgets.find(x => x.id === editId);
        if (b) {
          setCategoryId(b.category_id);
          setLimit(String(b.monthly_limit));
          setRecurrence(b.recurrence);
          setAlertEnabled(!!b.alert_near_limit);
        }
      }
    })();
  }, [editId]);

  async function handleSave() {
    if (!categoryId || !parseFloat(limit)) return;
    const payload = { category_id: categoryId, monthly_limit: parseFloat(limit), recurrence, alert_near_limit: alertEnabled ? 1 : 0, alert_threshold_pct: 90 };
    if (editId) await updateBudget(editId, payload);
    else await createBudget(payload);
    navigation.goBack();
  }

  function handleDelete() {
    confirm({
      title: 'Delete budget?',
      message: `This removes the monthly limit for ${selectedCategory?.name ?? 'this category'}. Your transactions stay; only the budget goes.`,
      icon: 'trash-2',
      buttons: [
        { text: 'Delete budget', style: 'destructive', onPress: async () => { if (editId) await deleteBudget(editId); navigation.goBack(); } },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit budget' : 'New budget'}</Text>
        <Pressable onPress={handleSave}><Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.accent500 }}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Category</Text>
        {editId ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.neutral50, borderRadius: radius.lg, marginBottom: 22 }}>
            {selectedCategory && <Feather name={mapIcon(selectedCategory.icon)} size={18} color={selectedCategory.color} />}
            <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{selectedCategory?.name}</Text>
            <Feather name="lock" size={14} color={colors.neutral400} style={{ marginLeft: 'auto' }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {categories.map(c => (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: radius.md, backgroundColor: c.id === categoryId ? colors.accentTint : colors.neutral50 }}>
                <Feather name={mapIcon(c.icon)} size={15} color={c.color} />
                <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Input label="Monthly limit" value={limit} onChangeText={t => setLimit(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="10000" focused />

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Repeats</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <SegmentOption label="Every month" selected={recurrence === 'monthly'} onPress={() => setRecurrence('monthly')} />
          <SegmentOption label="This month only" selected={recurrence === 'one_time'} onPress={() => setRecurrence('one_time')} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
          <View>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Alert near limit</Text>
            <Text style={{ ...typography.caption, color: colors.neutral400 }}>Notify at 90% of budget</Text>
          </View>
          <ToggleSwitch value={alertEnabled} onValueChange={setAlertEnabled} />
        </View>

        {editId && (
          <View style={{ marginTop: 24 }}>
            <Button label="Delete budget" variant="destructive" onPress={handleDelete} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
