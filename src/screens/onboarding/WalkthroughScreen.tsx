import React, { useRef, useState } from 'react';
import { View, Text, SafeAreaView, FlatList, Pressable, useWindowDimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';

interface Slide {
  key: string;
  icon: string;
  tint: 'accent' | 'income' | 'expense' | 'warning';
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'layers',
    tint: 'accent',
    title: 'Welcome to Tally',
    body: 'Track your money and build better habits — fully offline. No account, no cloud, no ads.',
  },
  {
    key: 'home',
    icon: 'home',
    tint: 'accent',
    title: 'Your dashboard',
    body: 'See your total balance, this month\'s income and spending, budget progress and today\'s habits — all on one screen.',
  },
  {
    key: 'money',
    icon: 'credit-card',
    tint: 'expense',
    title: 'Track every rupee',
    body: 'Log expenses, income and transfers in seconds. Organise them with accounts, categories and budgets that keep you on track.',
  },
  {
    key: 'habits',
    icon: 'check-square',
    tint: 'income',
    title: 'Build habits that stick',
    body: 'Create daily or custom-schedule habits, check in with one tap, and watch your streaks grow.',
  },
  {
    key: 'reports',
    icon: 'bar-chart-2',
    tint: 'warning',
    title: 'Understand your money',
    body: 'Visual reports show where your money goes, how your balance trends, and how consistent your habits are.',
  },
];

/**
 * Swipeable feature walkthrough shown at the very start of onboarding.
 * The primary "Get started" action is available on every slide, so users can either
 * swipe through the tour or jump straight in.
 */
export default function WalkthroughScreen({ onNext }: { onNext: () => void }) {
  const { colors, typography, radius } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const tintFor = (t: Slide['tint']) => ({
    accent: { bg: colors.accentTint, fg: colors.accent500 },
    income: { bg: colors.incomeTint, fg: colors.income },
    expense: { bg: colors.expenseTint, fg: colors.expense },
    warning: { bg: colors.warningTint, fg: colors.warning },
  }[t]);

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      {/* Skip is only useful while there are still slides ahead. */}
      <View style={{ height: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20 }}>
        {!isLast && (
          <Pressable onPress={onNext} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip walkthrough">
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral500 }}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== index) setIndex(next);
        }}
        renderItem={({ item }) => {
          const tint = tintFor(item.tint);
          return (
            <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <View
                style={{
                  width: 108, height: 108, borderRadius: radius.xxl,
                  backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 32,
                }}
              >
                <Feather name={item.icon} size={48} color={tint.fg} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.neutral900, textAlign: 'center', marginBottom: 12 }}>
                {item.title}
              </Text>
              <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', lineHeight: 22 }}>
                {item.body}
              </Text>
            </View>
          );
        }}
      />

      {/* Page indicators reflect the current slide. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 }}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? colors.accent500 : colors.neutral200,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Button
          label="Get started"
          onPress={onNext}
          icon={<Feather name="arrow-right" size={18} color="#FFFFFF" />}
        />
        <Text style={{ ...typography.bodySmall, color: colors.neutral400, textAlign: 'center', marginTop: 14 }}>
          Your data stays on this device
        </Text>
      </View>
    </SafeAreaView>
  );
}
