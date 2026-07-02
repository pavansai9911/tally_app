import { Feather } from '@expo/vector-icons';

// Maps the Tabler icon names used in the design spec to the closest Feather icon
// (Feather ships free with @expo/vector-icons, no extra asset bundling required)
const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  'ti-tools-kitchen-2': 'coffee',
  'ti-car': 'truck',
  'ti-shopping-bag': 'shopping-bag',
  'ti-bolt': 'zap',
  'ti-medical-cross': 'plus-square',
  'ti-briefcase': 'briefcase',
  'ti-home': 'home',
  'ti-device-tv': 'tv',
  'ti-cash': 'dollar-sign',
  'ti-building-bank': 'home',
  'ti-credit-card': 'credit-card',
  'ti-wallet': 'briefcase',
  'ti-repeat': 'repeat',
  'ti-chart-pie': 'pie-chart',
  'ti-category': 'grid',
  'ti-receipt': 'file-text',
  'ti-run': 'activity',
  'ti-moon': 'moon',
  'ti-glass-full': 'droplet',
  'ti-book': 'book',
  'ti-smoking-no': 'slash',
  'ti-flame': 'zap',
  'ti-trophy': 'award',
  'ti-percentage': 'percent',
  'ti-dots': 'more-horizontal',
  'ti-checklist': 'check-square',
};

export function mapIcon(tablerName: string): keyof typeof Feather.glyphMap {
  return ICON_MAP[tablerName] ?? 'circle';
}

export const CATEGORY_ICON_OPTIONS = [
  'ti-tools-kitchen-2', 'ti-car', 'ti-shopping-bag', 'ti-bolt', 'ti-medical-cross',
  'ti-briefcase', 'ti-home', 'ti-device-tv', 'ti-dots',
];

export const HABIT_ICON_OPTIONS = [
  'ti-run', 'ti-moon', 'ti-glass-full', 'ti-book', 'ti-smoking-no', 'ti-checklist',
];

export const CATEGORY_COLOR_OPTIONS = ['#E0473F', '#3D5AFE', '#1A9E6B', '#C98A1B', '#6B7280', '#9AA1A9'];
