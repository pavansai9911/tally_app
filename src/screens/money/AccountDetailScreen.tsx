import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateTimeLabel } from '@/utils/format';
import {
  getAccount, getAccountBalance, getAccountFlow, listAccountTransactions,
  Account, AccountTransaction,
} from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AccountDetail'>;
type DirFilter = 'in' | 'out' | null;

export default function AccountDetailScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const accId = route.params.id;
  const [account, setAccount] = useState<Account | null>(null);
  const [txs, setTxs] = useState<AccountTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [flow, setFlow] = useState({ inflow: 0, outflow: 0 });
  const [filter, setFilter] = useState<DirFilter>(null);

  const load = useCallback(async (dir: DirFilter) => {
    setAccount(await getAccount(accId));
    setBalance(await getAccountBalance(accId));
    setFlow(await getAccountFlow(accId));
    setTxs(await listAccountTransactions(accId, { limit: 50, direction: dir ?? undefined }));
  }, [accId]);

  // Reload whenever the screen refocuses (e.g. after editing a transaction) or the filter changes.
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  if (!account) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }} />;

  // Tapping the active filter again clears it (back to All).
  const toggle = (dir: 'in' | 'out') => setFilter(prev => (prev === dir ? null : dir));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Pressable onPress={() => navigation.navigate('AddEditAccount', { id: account.id })} hitSlop={8} accessibilityLabel="Edit account">
          <Feather name="edit-2" size={19} color={colors.neutral900} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: account.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Feather name={mapIcon(account.icon)} size={26} color={account.color} />
        </View>
        <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{account.name}</Text>
        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.neutral900, marginTop: 4 }}>{formatCurrency(balance)}</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral400, marginTop: 4 }}>{account.type[0].toUpperCase() + account.type.slice(1)} account</Text>
      </View>

      {/* IN / OUT act as filters: tap to show only that direction, tap again to reset. */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 14 }}>
        <FilterCard
          label="In" value={formatCurrency(flow.inflow)} active={filter === 'in'}
          tint={colors.incomeTint} fg={colors.income} activeBorder={colors.income}
          onPress={() => toggle('in')} colors={colors} typography={typography} radius={radius}
        />
        <FilterCard
          label="Out" value={formatCurrency(flow.outflow)} active={filter === 'out'}
          tint={colors.expenseTint} fg={colors.expense} activeBorder={colors.expense}
          onPress={() => toggle('out')} colors={colors} typography={typography} radius={radius}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase' }}>
            {filter === 'in' ? 'Incoming' : filter === 'out' ? 'Outgoing' : 'Recent activity'}
          </Text>
          {filter && (
            <Pressable onPress={() => setFilter(null)} hitSlop={8}>
              <Text style={{ ...typography.caption, color: colors.accent500 }}>Clear filter</Text>
            </Pressable>
          )}
        </View>

        {txs.length === 0 ? (
          <Text style={{ ...typography.bodySmall, color: colors.neutral400, paddingVertical: 20, textAlign: 'center' }}>
            No {filter === 'in' ? 'incoming' : filter === 'out' ? 'outgoing' : ''} transactions.
          </Text>
        ) : txs.map(t => {
          const isTransfer = t.type === 'transfer';
          const title = isTransfer
            ? (t.counterparty_name ? `Transfer ${t.direction === 'out' ? 'to' : 'from'} ${t.counterparty_name}` : 'Transfer')
            : (t.category_name || (t.type === 'income' ? 'Income' : 'Transaction'));
          const iconName = isTransfer ? 'repeat' : mapIcon(t.category_icon ?? 'ti-dots');
          const iconColor = isTransfer ? colors.neutral500 : (t.category_color ?? colors.neutral500);
          const tint = isTransfer ? colors.neutral50 : (t.category_color ?? colors.neutral400) + '22';
          return (
            <Pressable
              key={t.id}
              onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={iconName} size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
                <Text style={{ ...typography.caption, color: colors.neutral400 }} numberOfLines={1}>{formatDateTimeLabel(t.occurred_at)}</Text>
              </View>
              <Text style={{ ...typography.bodySmallMedium, color: t.direction === 'in' ? colors.income : colors.expense }}>
                {t.direction === 'in' ? '+' : '-'}{formatCurrency(t.amount).replace('-', '')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Edit account" variant="secondary" onPress={() => navigation.navigate('AddEditAccount', { id: account.id })} />
      </View>
    </SafeAreaView>
  );
}

function FilterCard({ label, value, active, tint, fg, activeBorder, onPress, colors, typography, radius }: {
  label: string; value: string; active: boolean; tint: string; fg: string; activeBorder: string; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; typography: ReturnType<typeof useTheme>['typography']; radius: ReturnType<typeof useTheme>['radius'];
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1, padding: 12, backgroundColor: tint, borderRadius: radius.lg, alignItems: 'center',
        borderWidth: 1.5, borderColor: active ? activeBorder : 'transparent',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ ...typography.caption, color: fg, textTransform: 'uppercase' }}>{label}</Text>
        <Feather name={active ? 'check-circle' : 'filter'} size={11} color={fg} />
      </View>
      <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{value}</Text>
    </Pressable>
  );
}
