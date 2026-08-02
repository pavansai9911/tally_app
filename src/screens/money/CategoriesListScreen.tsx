import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Button, SegmentOption } from '@/components/ui';
import { DraggableCategoryList } from '@/components/DraggableCategoryList';
import { listCategories, countTransactionsForCategory, reorderCategories, Category } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'CategoriesList'>;
type Row = Category & { count: number };

export default function CategoriesListScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [expense, setExpense] = useState<Row[]>([]);
  const [income, setIncome] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    const withCounts = async (t: 'expense' | 'income') =>
      Promise.all((await listCategories(t)).map(async c => ({ ...c, count: await countTransactionsForCategory(c.id) })));
    setExpense(await withCounts('expense'));
    setIncome(await withCounts('income'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = type === 'expense' ? expense : income;
  // "Other" is pinned to the bottom and not draggable; everything else can be reordered.
  // Memoised so the identity is stable across re-renders (e.g. while dragging toggles state) —
  // otherwise DraggableCategoryList's sync-effect would reset the order mid-drag.
  const pinned = useMemo(() => list.find(c => c.default_key === 'other') ?? null, [list]);
  const draggables = useMemo(() => list.filter(c => c.default_key !== 'other'), [list]);

  // Persist only — do NOT reload, so the list doesn't flicker back; the draggable list already
  // shows the new order optimistically and the DB now matches it.
  const handleReorder = useCallback((orderedIds: string[]) => {
    reorderCategories(orderedIds).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Categories</Text>
        <Pressable onPress={() => navigation.navigate('AddEditCategory', undefined)}>
          <Feather name="plus" size={22} color={colors.accent500} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 8, gap: 8 }}>
        <SegmentOption label="Expense" selected={type === 'expense'} onPress={() => setType('expense')} selectedBg={colors.neutral900} selectedFg={colors.neutral0} />
        <SegmentOption label="Income" selected={type === 'income'} onPress={() => setType('income')} selectedBg={colors.neutral900} selectedFg={colors.neutral0} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon={<Feather name="grid" size={38} color={colors.neutral400} />}
          title={`No ${type} categories yet`}
          description={type === 'income' ? 'Create categories like Salary or Freelance to organize where your money comes from' : 'Create categories to organize what you spend on'}
          actionLabel="Add category"
          onAction={() => navigation.navigate('AddEditCategory', undefined)}
        />
      ) : (
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ ...typography.caption, color: colors.neutral400, marginBottom: 6 }}>
            Drag the handle to reorder{pinned ? ' · “Other” stays last' : ''}
          </Text>
          <DraggableCategoryList
            items={draggables}
            pinned={pinned}
            onReorder={handleReorder}
            onPress={(id) => navigation.navigate('AddEditCategory', { id })}
            onDragActive={setDragging}
          />
          <View style={{ marginTop: 16 }}>
            <Button label="Add category" variant="secondary" icon={<Feather name="plus" size={16} color={colors.neutral900} />} onPress={() => navigation.navigate('AddEditCategory', undefined)} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
