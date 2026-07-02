// Tally design tokens — colors
// Source: Tally Frontend Design Specification, Section 2.1

export const lightColors = {
  // Neutrals
  neutral0: '#FFFFFF',
  neutral50: '#F7F8F9',
  neutral100: '#EEF0F2',
  neutral200: '#E2E5E8',
  neutral300: '#C7CCD1',
  neutral400: '#9AA1A9',
  neutral500: '#6B7280',
  neutral600: '#4B5159',
  neutral700: '#2E3338',
  neutral900: '#13161A',

  // Accent
  accent500: '#3D5AFE',
  accent600: '#2A40D9',
  accentTint: '#EEF1FF',

  // Semantic
  income: '#1A9E6B',
  incomeTint: '#E8F8F0',
  expense: '#E0473F',
  expenseTint: '#FDECEA',
  warning: '#C98A1B',
  warningTint: '#FBF1DD',

  // Surfaces
  surfaceCard: '#FFFFFF',
  surfaceSunken: '#F7F8F9',
  surfaceBorder: '#E7E9EC',
  surfaceOverlay: 'rgba(19,22,26,0.50)',

  // Heatmap intensities (habits)
  heatEmpty: '#F0F1F3',
  heatLight: '#C8E6D7',
  heatMid: '#7FC9A4',
  heatFull: '#1A9E6B',
};

export const darkColors = {
  neutral0: '#15171A',
  neutral50: '#1B1E22',
  neutral100: '#23272C',
  neutral200: '#2C3137',
  neutral300: '#3A4047',
  neutral400: '#5B6470',
  neutral500: '#8A93A0',
  neutral600: '#AEB6C0',
  neutral700: '#D2D7DC',
  neutral900: '#F4F6F8',

  accent500: '#5B79FF',
  accent600: '#7A92FF',
  accentTint: '#1B2040',

  income: '#34C28A',
  incomeTint: '#13301F',
  expense: '#FF6259',
  expenseTint: '#3A1816',
  warning: '#E0A53A',
  warningTint: '#332A12',

  surfaceCard: '#1F2227',
  surfaceSunken: '#16181C',
  surfaceBorder: '#2C3137',
  surfaceOverlay: 'rgba(0,0,0,0.65)',

  heatEmpty: '#23272C',
  heatLight: '#1B3A2C',
  heatMid: '#246E4E',
  heatFull: '#34C28A',
};

// The Lock module always uses this fixed dark palette regardless of app theme
// (Section 2.1.4 of the spec — deliberate, not a theme toggle)
export const lockColors = {
  background: '#13161A',
  keypadButton: '#1B1E22',
  dotEmptyBorder: '#3A4047',
  accent: '#5B79FF',
  expense: '#FF6259',
  textSecondary: '#8A93A0',
};

export type ColorScheme = typeof lightColors;
