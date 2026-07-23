import Feather from 'react-native-vector-icons/Feather';

// Maps the Tabler icon names used in the design spec to the closest Feather icon
// (Feather ships with react-native-vector-icons; fonts linked via fonts.gradle)
const ICON_MAP: Record<string, string> = {
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
  // Extended set (friends, trips, entertainment, etc.)
  'ti-users': 'users',
  'ti-map-pin': 'map-pin',
  'ti-map': 'map',
  'ti-plane': 'send',
  'ti-gift': 'gift',
  'ti-movie': 'film',
  'ti-music': 'music',
  'ti-coffee': 'coffee',
  'ti-cart': 'shopping-cart',
  'ti-heart': 'heart',
  'ti-phone': 'smartphone',
  'ti-wifi': 'wifi',
  'ti-star': 'star',
  'ti-camera': 'camera',
  'ti-headphones': 'headphones',
  'ti-umbrella': 'umbrella',
  'ti-tool': 'tool',
  'ti-book-open': 'book-open',
  'ti-sun': 'sun',
  'ti-tag': 'tag',
  'ti-trending-up': 'trending-up',
  'ti-package': 'package',
  'ti-scissors': 'scissors',
  'ti-thermometer': 'thermometer',
  'ti-smile': 'smile',
  'ti-target': 'target',
  'ti-calendar': 'calendar',
  'ti-pencil': 'edit-2',
  'ti-water': 'droplet',
  'ti-award2': 'award',
};

export function mapIcon(tablerName: string): string {
  return ICON_MAP[tablerName] ?? 'circle';
}

export const CATEGORY_ICON_OPTIONS = [
  'ti-tools-kitchen-2', 'ti-cart', 'ti-car', 'ti-shopping-bag', 'ti-device-tv', 'ti-movie',
  'ti-music', 'ti-bolt', 'ti-wifi', 'ti-phone', 'ti-medical-cross', 'ti-heart', 'ti-home',
  'ti-users', 'ti-gift', 'ti-map-pin', 'ti-plane', 'ti-coffee', 'ti-book', 'ti-camera',
  'ti-briefcase', 'ti-tag', 'ti-umbrella', 'ti-tool', 'ti-star', 'ti-dots',
];

export const HABIT_ICON_OPTIONS = [
  'ti-run', 'ti-heart', 'ti-book', 'ti-book-open', 'ti-glass-full', 'ti-water', 'ti-moon',
  'ti-sun', 'ti-smoking-no', 'ti-music', 'ti-headphones', 'ti-pencil', 'ti-target',
  'ti-smile', 'ti-checklist', 'ti-flame',
];

export const CATEGORY_COLOR_OPTIONS = [
  '#E0473F', '#F2711C', '#C98A1B', '#1A9E6B', '#149C8E', '#3D5AFE',
  '#5B79FF', '#7C4DFF', '#D6336C', '#6B7280', '#4B5159', '#9AA1A9',
];
