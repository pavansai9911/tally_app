import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Button } from '@/components/ui';
import { SwipeTabs } from '@/components/SwipeTabs';
import { mapIcon } from '@/utils/iconMap';
import { listCategories, countTransactionsForCategory, Category } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'CategoriesList'>;
type CategoryWithCount = Category & { count: number };

export default function CategoriesListScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [expense, setExpense] = useState<CategoryWithCount[]>([]);
  const [income, setIncome] = useState<CategoryWithCount[]>([]);

  const load = useCallback(async () => {
    const withCounts = async (t: 'expense' | 'income') =>
      Promise.all((await listCategories(t)).map(async c => ({ ...c, count: await countTransactionsForCategory(c.id) })));
    setExpense(await withCounts('expense'));
    setIncome(await withCounts('income'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderPage = (list: CategoryWithCount[], kind: 'expense' | 'income') =>
    list.length === 0 ? (
      <EmptyState
        icon={<Feather name="grid" size={38} color={colors.neutral400} />}
        title={`No ${kind} categories yet`}
        description={kind === 'income' ? 'Create categories like Salary or Freelance to organize where your money comes from' : 'Create categories to organize what you spend on'}
        actionLabel="Add category"
        onAction={() => navigation.navigate('AddEditCategory', undefined)}
      />
    ) : (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {list.map(c => (
          <Pressable key={c.id} onPress={() => navigation.navigate('AddEditCategory', { id: c.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(c.icon)} size={18} color={c.color} />
            </View>
            <Text style={{ flex: 1, ...typography.bodyMedium, color: colors.neutral900 }}>{c.name}</Text>
            <Text style={{ ...typography.caption, color: colors.neutral400 }}>{c.count} transactions</Text>
            <Feather name="chevron-right" size={16} color={colors.neutral300} />
          </Pressable>
        ))}
        <View style={{ marginTop: 16, marginBottom: 24 }}>
          <Button label="Add category" variant="secondary" icon={<Feather name="plus" size={16} color={colors.neutral900} />} onPress={() => navigation.navigate('AddEditCategory', undefined)} />
        </View>
      </ScrollView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Categories</Text>
        <Pressable onPress={() => navigation.navigate('AddEditCategory', undefined)}>
          <Feather name="plus" size={22} color={colors.accent500} />
        </Pressable>
      </View>

      <SwipeTabs labels={['Expense', 'Income']} index={type === 'expense' ? 0 : 1} onIndexChange={(i) => setType(i === 0 ? 'expense' : 'income')}>
        {renderPage(expense, 'expense')}
        {renderPage(income, 'income')}
      </SwipeTabs>
    </SafeAreaView>
  );
}
