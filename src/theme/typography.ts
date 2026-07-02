// Tally design tokens — typography
// Source: Tally Frontend Design Specification, Section 2.2
// Font: Inter (must be loaded via expo-font in App.tsx)

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.3 },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.12 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.06 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const, letterSpacing: 0 },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const, letterSpacing: 0 },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0 },
  bodySmallMedium: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.2 },
  amountLarge: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.14 },
  amountMedium: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0 },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0 },
};

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
