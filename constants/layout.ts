export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

export const duration = {
  fast: 140,
  base: 220,
  slow: 380,
  deliberate: 620,
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 64,
  minTouchTarget: 44,
  /** Readable column width on tablets and the web. */
  maxContentWidth: 560,
  /** Space reserved under scroll content for the floating tab bar. */
  tabBarClearance: 96,
} as const;
