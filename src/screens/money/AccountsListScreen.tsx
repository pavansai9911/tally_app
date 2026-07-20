import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { listAccounts, AccountWithBalance } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AccountsList'>;

export default function AccountsListScreen({ navigation }: Props) {
  const { colors, typography, radius, isDark } = useTheme();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);

  useFocusEffect(useCallback(() => { listAccounts().then(setAccounts); }, []));

  const total = accounts.filter(a => a.include_in_total).reduce((s, a) => s + a.current_balance, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Accounts</Text>
        <Pressable onPress={() => navigation.navigate('AddEditAccount', undefined)}>
          <Feather name="plus" size={22} color={colors.accent500} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
        <View style={{ backgroundColor: isDark ? colors.neutral200 : colors.neutral900, borderRadius: radius.xl, padding: 20 }}>
          <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase' }}>Total balance</Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 6 }}>{formatCurrency(total)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        {accounts.map(a => (
          <Pressable
            key={a.id}
            onPress={() => navigation.navigate('AccountDetail', { id: a.id })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 0.5, borderColor: colors.surfaceBorder, borderRadius: radius.lg, marginBottom: 12 }}
          >
            <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(a.icon)} size={22} color={a.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{a.name}</Text>
              <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{a.type[0].toUpperCase() + a.type.slice(1)} account</Text>
            </View>
            <Text style={{ ...typography.h3, color: a.current_balance < 0 ? colors.expense : colors.neutral900 }}>
              {formatCurrency(a.current_balance)}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => navigation.navigate('AddEditAccount', undefined)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 0.5, borderColor: colors.neutral300, borderStyle: 'dashed', borderRadius: radius.lg, marginBottom: 24 }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="plus" size={22} color={colors.neutral400} />
          </View>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral400 }}>Add new account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
