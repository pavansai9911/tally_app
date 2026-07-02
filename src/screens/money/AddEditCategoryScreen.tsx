import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input } from '@/components/ui';
import { mapIcon, CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_OPTIONS } from '@/utils/iconMap';
import { createCategory, updateCategory, deleteCategory, listCategories, countTransactionsForCategory, Category } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AddEditCategory'>;

export default function AddEditCategoryScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICON_OPTIONS[0]);
  const [color, setColor] = useState(CATEGORY_COLOR_OPTIONS[0]);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    if (editId) {
      (async () => {
        const all = await listCategories();
        const cat = all.find(c => c.id === editId);
        if (cat) {
          setName(cat.name);
          setIcon(cat.icon);
          setColor(cat.color);
          setType(cat.type);
        }
      })();
    }
  }, [editId]);

  async function handleSave() {
    if (!name.trim()) return;
    if (editId) await updateCategory(editId, { name, icon, color });
    else await createCategory({ name, icon, color, type });
    navigation.goBack();
  }

  async function handleDelete() {
    if (!editId) return;
    const count = await countTransactionsForCategory(editId);
    Alert.alert(
      'Delete category?',
      count > 0 ? `This category has ${count} transaction${count === 1 ? '' : 's'}. They will be kept but unlinked from this category.` : 'This category will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(editId); navigation.goBack(); } },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit category' : 'New category'}</Text>
        <Pressable onPress={handleSave}><Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.accent500 }}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={mapIcon(icon)} size={28} color={color} />
          </View>
        </View>

        <Input label="Category name" value={name} onChangeText={setName} focused />

        {!editId && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
            <Pressable onPress={() => setType('expense')} style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: type === 'expense' ? colors.expenseTint : colors.neutral50, alignItems: 'center' }}>
              <Text style={{ ...typography.bodySmallMedium, color: type === 'expense' ? colors.expense : colors.neutral500 }}>Expense</Text>
            </Pressable>
            <Pressable onPress={() => setType('income')} style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: type === 'income' ? colors.incomeTint : colors.neutral50, alignItems: 'center' }}>
              <Text style={{ ...typography.bodySmallMedium, color: type === 'income' ? colors.income : colors.neutral500 }}>Income</Text>
            </Pressable>
          </View>
        )}

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Icon</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
          {CATEGORY_ICON_OPTIONS.map(opt => (
            <Pressable key={opt} onPress={() => setIcon(opt)} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: opt === icon ? color : colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(opt)} size={20} color={opt === icon ? '#FFFFFF' : colors.neutral500} />
            </Pressable>
          ))}
        </View>

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Color</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {CATEGORY_COLOR_OPTIONS.map(c => (
            <Pressable key={c} onPress={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: c === color ? 2 : 0, borderColor: colors.neutral900 }}>
              {c === color && <Feather name="check" size={14} color="#FFFFFF" />}
            </Pressable>
          ))}
        </View>

        {editId && <Button label="Delete category" variant="destructive" onPress={handleDelete} />}
      </ScrollView>
    </SafeAreaView>
  );
}
