// Tally design tokens — spacing, radius, elevation
// Source: Tally Frontend Design Specification, Sections 2.3-2.5

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// React Native shadow props (iOS) — pair with elevation (Android) at call sites
export const elevation = {
  e0: { shadowOpacity: 0, elevation: 0 },
  e1: {
    shadowColor: '#13161A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  e2: {
    shadowColor: '#13161A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  e3: {
    shadowColor: '#13161A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 8,
  },
};
